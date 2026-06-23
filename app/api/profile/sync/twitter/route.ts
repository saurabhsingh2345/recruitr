/**
 * POST /api/profile/sync/twitter
 *
 * Parses a candidate's X/Twitter public profile (bio + recent tweets) via
 * Twitter API v2 Bearer Token (app-only, no OAuth required for public data).
 * Extracts hard technical skills, merges additively into parsedSkills, and
 * upserts the twitter connection entry.
 *
 * Required env var: TWITTER_BEARER_TOKEN
 * Optional body: { handle: "@username" } — falls back to saved connection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN

const TWITTER_AI_PROMPT = `You are analyzing a developer's X/Twitter bio and recent tweets to extract technical skills.

Return ONLY valid JSON:
{
  "skills": [
    { "name": "skill name", "evidence": ["tweet or bio excerpt"], "confidence": 0-100 }
  ],
  "summary": "1-2 sentence professional summary"
}

Rules:
- Only extract hard technical skills (languages, frameworks, tools, platforms)
- Ignore retweets unless they show genuine expertise
- Confidence: 80+ if they tweet code/tutorials about it, 50-70 if they mention it casually
- Skip skill if confidence < 50`

async function fetchTwitterProfile(username: string) {
  if (!BEARER_TOKEN) throw new Error('TWITTER_BEARER_TOKEN not configured')

  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=description,public_metrics`,
    { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
  )
  if (!userRes.ok) {
    const err = await userRes.json()
    throw new Error(err?.detail || `Twitter API ${userRes.status}`)
  }
  const userData = await userRes.json()
  const userId = userData.data?.id
  if (!userId) throw new Error('Twitter user not found')

  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=20&tweet.fields=text`,
    { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
  )
  const tweetsData = tweetsRes.ok ? await tweetsRes.json() : { data: [] }

  return {
    bio: (userData.data?.description || '') as string,
    tweets: ((tweetsData.data || []) as { text: string }[]).map((t) => t.text).join('\n'),
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!BEARER_TOKEN) {
    return NextResponse.json(
      { error: 'Twitter sync is not enabled on this instance', code: 'TWITTER_NOT_CONFIGURED' },
      { status: 503 }
    )
  }

  try {
    await connectDB()

    // Resolve handle from body or from saved connection
    let handle: string | undefined
    try {
      const body = await req.json()
      handle = body.handle?.replace(/^@/, '').trim()
    } catch { /* no body */ }

    if (!handle) {
      const dbUser = await User.findById(session.user.id).select('connections')
      const saved = dbUser?.connections?.find((c: { source: string; handle: string }) => c.source === 'twitter')
      handle = saved?.handle?.replace(/^@/, '').trim()
    }

    if (!handle) {
      return NextResponse.json({ error: 'No Twitter handle saved. Connect your handle first.' }, { status: 400 })
    }

    const { bio, tweets } = await fetchTwitterProfile(handle)

    const { text: raw } = await generateText({
      model: await getModel(),
      prompt: `${TWITTER_AI_PROMPT}\n\nBio: ${bio}\n\nRecent tweets:\n${tweets}`,
      maxOutputTokens: 800,
    })

    let analysis: { skills?: { name: string; evidence: string[]; confidence: number }[]; summary?: string }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch?.[0] || '{}')
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const profile = await Profile.findOne({ userId: session.user.id })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Additive skill merge — preserve skills from all other sources
    const incoming = (analysis.skills || []).filter((s) => s.name && s.confidence >= 50)
    const incomingNames = new Set(incoming.map((s) => s.name.toLowerCase()))
    const preserved = (profile.parsedSkills as { name: string }[]).filter(
      (s) => !incomingNames.has(s.name.toLowerCase())
    )
    const now = new Date()
    const merged = incoming.map((s) => ({
      name: s.name,
      evidence: s.evidence || [],
      proofScore: Math.round(s.confidence * 0.5),
      lastUpdated: now,
      scoreHistory: [{ score: Math.round(s.confidence * 0.5), source: 'twitter', at: now }],
    }))
    profile.parsedSkills = [...preserved, ...merged]
    profile.twitterActivitySummary = analysis.summary || ''
    await profile.save()

    const summary = analysis.summary || `${merged.length} skills extracted from X/Twitter`

    // Upsert connection — pull old entry then push fresh (prevents duplicates)
    await User.findByIdAndUpdate(session.user.id, {
      $pull: { connections: { source: 'twitter' } },
    })
    await User.findByIdAndUpdate(session.user.id, {
      $push: {
        connections: {
          source: 'twitter',
          handle: `@${handle}`,
          status: 'connected',
          summary,
          lastSyncedAt: now,
        },
      },
    })

    return NextResponse.json({ ok: true, skillsAdded: merged.length, summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Twitter sync failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
