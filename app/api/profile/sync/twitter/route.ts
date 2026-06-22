/**
 * Twitter/X profile parser scaffold.
 *
 * Status: blocked on OAuth — requires Twitter Developer App with elevated access.
 * The parsing logic is ready; wire up OAuth tokens to activate.
 *
 * Required env vars (not yet set):
 *   TWITTER_CLIENT_ID     — from developer.twitter.com
 *   TWITTER_CLIENT_SECRET
 *   TWITTER_BEARER_TOKEN  — for app-only read (tweets/bio parsing)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN

const TWITTER_AI_PROMPT = `You are analyzing a developer's Twitter/X bio and recent tweets to identify their technical skills and specialisation.

Return ONLY valid JSON:
{
  "skills": [
    { "name": "skill name", "evidence": ["tweet or bio excerpt"], "confidence": 0-100 }
  ],
  "targetRole": "role derived from content",
  "summary": "2-3 sentence professional summary"
}

Rules:
- Only extract hard technical skills
- Ignore retweets unless they show genuine expertise
- Confidence: 80+ if they tweet code/tutorials about it, 50-70 if they mention it casually`

async function fetchTwitterUser(username: string) {
  if (!BEARER_TOKEN) throw new Error('TWITTER_BEARER_TOKEN is not configured')

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

  // Fetch recent tweets (last 20)
  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=20&tweet.fields=text`,
    { headers: { Authorization: `Bearer ${BEARER_TOKEN}` } }
  )
  const tweetsData = tweetsRes.ok ? await tweetsRes.json() : { data: [] }

  return {
    bio: userData.data?.description || '',
    tweets: (tweetsData.data || []).map((t: { text: string }) => t.text).join('\n'),
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
    const { twitterUsername } = await req.json()
    if (!twitterUsername?.trim()) {
      return NextResponse.json({ error: 'twitterUsername is required' }, { status: 400 })
    }

    const handle = twitterUsername.replace(/^@/, '').trim()
    const { bio, tweets } = await fetchTwitterUser(handle)

    const { text: raw } = await generateText({
      model: await getModel(),
      prompt: `${TWITTER_AI_PROMPT}\n\nBio: ${bio}\n\nRecent tweets:\n${tweets}`,
      maxOutputTokens: 800,
    })

    let analysis: {
      skills?: { name: string; evidence: string[]; confidence: number }[]
      targetRole?: string
      summary?: string
    }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch?.[0] || '{}')
    } catch {
      return NextResponse.json({ error: 'Failed to parse Twitter profile analysis' }, { status: 500 })
    }

    await connectDB()

    const profile = await Profile.findOne({ userId: session.user.id })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    let skillsAdded = 0
    for (const skill of analysis.skills || []) {
      if (!skill.name || skill.confidence < 50) continue
      const existing = profile.parsedSkills.find(
        (s: { name: string }) => s.name.toLowerCase() === skill.name.toLowerCase()
      )
      if (!existing) {
        profile.parsedSkills.push({
          name: skill.name,
          evidence: skill.evidence || [],
          proofScore: Math.round(skill.confidence * 0.5),
          lastUpdated: new Date(),
        })
        skillsAdded++
      }
    }

    await profile.save()

    await User.findByIdAndUpdate(session.user.id, {
      $push: {
        connections: {
          source: 'twitter',
          handle: `@${handle}`,
          status: 'connected',
          summary: analysis.summary || `${skillsAdded} skills extracted`,
          lastSyncedAt: new Date(),
        },
      },
    })

    return NextResponse.json({ success: true, skillsAdded, summary: analysis.summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Twitter sync failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
