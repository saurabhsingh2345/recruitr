/**
 * GitLab profile parser.
 * Uses the public GitLab REST API (no OAuth required for public profiles).
 * For private repos: set GITLAB_TOKEN in .env (personal access token with read_api scope).
 *
 * Required env vars (optional — public API works without them):
 *   GITLAB_TOKEN — personal access token for higher rate limits and private repos
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { calculateProofScore } from '@/lib/scoring'
import { generateText } from 'ai'

const GITLAB_API = 'https://gitlab.com/api/v4'
const GITLAB_TOKEN = process.env.GITLAB_TOKEN

function gitlabHeaders() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (GITLAB_TOKEN) h['PRIVATE-TOKEN'] = GITLAB_TOKEN
  return h
}

const GITLAB_AI_PROMPT = `You are analyzing a developer's GitLab profile to extract their technical skills.

Given their repository list and bio, return ONLY valid JSON:
{
  "skills": [
    {
      "name": "skill name",
      "evidence": ["repo name or specific evidence"],
      "evidenceCount": <number of repos>,
      "repoComplexity": <0-100 estimated complexity>,
      "recencyMonths": <months since last activity>
    }
  ],
  "targetRole": "role derived from repos",
  "bio": "2-sentence professional bio",
  "summary": "key technical highlights"
}

Rules:
- Infer skills from repo languages, topics, and names
- repoComplexity: 70+ for production systems, 40-70 for mid-size projects, <40 for demos
- recencyMonths: 0 for recent activity, 24+ for old repos`

async function fetchGitLabProfile(username: string) {
  const headers = gitlabHeaders()

  const userRes = await fetch(`${GITLAB_API}/users?username=${encodeURIComponent(username)}`, { headers })
  if (!userRes.ok) throw new Error(`GitLab API error: ${userRes.status}`)
  const users = await userRes.json()
  if (!users?.length) throw new Error('GitLab user not found')

  const user = users[0]
  const userId = user.id

  // Fetch public projects (up to 30)
  const reposRes = await fetch(
    `${GITLAB_API}/users/${userId}/projects?per_page=30&order_by=last_activity_at&sort=desc`,
    { headers }
  )
  const repos = reposRes.ok ? await reposRes.json() : []

  return {
    bio: user.bio || '',
    name: user.name || username,
    repos: (repos || []).map((r: {
      name: string
      description?: string
      topics?: string[]
      last_activity_at?: string
      star_count?: number
    }) => ({
      name: r.name,
      description: r.description || '',
      topics: r.topics || [],
      lastActivity: r.last_activity_at,
      stars: r.star_count || 0,
    })),
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { gitlabUsername } = await req.json()
    if (!gitlabUsername?.trim()) {
      return NextResponse.json({ error: 'gitlabUsername is required' }, { status: 400 })
    }

    const handle = gitlabUsername.replace(/^@/, '').trim()
    const { bio, name, repos } = await fetchGitLabProfile(handle)

    const repoSummary = repos
      .slice(0, 20)
      .map((r: { name: string; description: string; topics: string[]; stars: number }) =>
        `- ${r.name}: ${r.description || 'no description'} | topics: ${r.topics.join(', ') || 'none'} | ★${r.stars}`
      )
      .join('\n')

    const { text: raw } = await generateText({
      model: await getModel(),
      prompt: `${GITLAB_AI_PROMPT}\n\nUser: ${name}\nBio: ${bio}\n\nRepositories:\n${repoSummary}`,
      maxOutputTokens: 1000,
    })

    let analysis: {
      skills?: {
        name: string
        evidence: string[]
        evidenceCount?: number
        repoComplexity?: number
        recencyMonths?: number
      }[]
      targetRole?: string
      bio?: string
      summary?: string
    }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch?.[0] || '{}')
    } catch {
      return NextResponse.json({ error: 'Failed to parse GitLab profile analysis' }, { status: 500 })
    }

    await connectDB()

    const profile = await Profile.findOne({ userId: session.user.id })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    let skillsAdded = 0
    for (const skill of analysis.skills || []) {
      if (!skill.name) continue
      const existing = profile.parsedSkills.find(
        (s: { name: string }) => s.name.toLowerCase() === skill.name.toLowerCase()
      )
      if (!existing) {
        const proofScore = calculateProofScore({
          evidenceCount: skill.evidenceCount ?? repos.length,
          repoComplexity: skill.repoComplexity ?? 50,
          recencyMonths: skill.recencyMonths ?? 6,
        })
        profile.parsedSkills.push({
          name: skill.name,
          evidence: skill.evidence || [],
          proofScore,
          lastUpdated: new Date(),
          scoreHistory: [{ score: proofScore, source: 'gitlab', at: new Date() }],
        })
        skillsAdded++
      }
    }

    if (analysis.bio && !profile.bio) profile.bio = analysis.bio
    if (analysis.targetRole && !profile.targetRole) profile.targetRole = analysis.targetRole
    await profile.save()

    // Upsert: remove stale entry first to avoid duplicates on re-sync
    await User.findByIdAndUpdate(session.user.id, { $pull: { connections: { source: 'gitlab' } } })
    await User.findByIdAndUpdate(session.user.id, {
      $push: {
        connections: {
          source: 'gitlab',
          handle,
          status: 'connected',
          summary: analysis.summary || `${skillsAdded} skills added from ${repos.length} repos`,
          lastSyncedAt: new Date(),
        },
      },
    })

    return NextResponse.json({ success: true, skillsAdded, summary: analysis.summary })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'GitLab sync failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
