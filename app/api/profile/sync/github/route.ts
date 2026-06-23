/**
 * POST /api/profile/sync/github
 *
 * Richer GitHub sync than /api/profile/generate:
 *  - Fetches user info (public_repos count), repos, recent events, and profile README
 *  - AI extracts skills + writes a 1-2 sentence activity summary
 *  - Merges skills additively (preserves LinkedIn, GitLab, DEV.to signals)
 *  - Stores activity summary in profile.githubActivitySummary → Atlas uses it
 *
 * If the user has zero public repos we return ok:false with a clear reason so
 * the UI can show a helpful message instead of silently doing nothing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { calculateProofScore } from '@/lib/scoring'
import { generateText } from 'ai'

const GITHUB_API = 'https://api.github.com'

function makeHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Intervue-App/1.0',
  }
  if (process.env.GITHUB_TOKEN) h.Authorization = `token ${process.env.GITHUB_TOKEN}`
  return h
}

interface GHRepo {
  name: string
  description?: string
  language?: string
  topics?: string[]
  stargazers_count?: number
  fork?: boolean
}

interface GHEvent {
  type: string
  repo?: { name: string }
  payload?: {
    commits?: { message: string }[]
    pull_request?: { title: string }
    issue?: { title: string }
  }
}

const SYNC_PROMPT = `You are analyzing a developer's GitHub profile to extract technical skills and summarise their recent activity.

Given their repos, recent events, and profile README, return ONLY valid JSON:
{
  "skills": [
    {
      "name": "skill name (language, framework, tool, or domain)",
      "evidence": ["repo name or event that proves this skill"],
      "evidenceCount": <integer — repos/events mentioning this skill>,
      "repoComplexity": <0–100 — 70+ for production systems, 40–70 for mid-size, <40 for demos>,
      "recencyMonths": <months since last visible activity — 0 for very recent>
    }
  ],
  "targetRole": "role inferred from project types (e.g. Full Stack Engineer, Backend Engineer, ML Engineer)",
  "activitySummary": "1–2 factual sentences about recent focus areas and standout projects"
}

Rules:
- Only include verifiable technical skills — no soft skills
- activitySummary must be factual and cite specific repo names or topics
- Return empty skills array if no clear technical signals are found`

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const dbUser = await User.findById(session.user.id).select('username').lean<{ username: string }>()
  if (!dbUser?.username) return NextResponse.json({ error: 'GitHub username not found' }, { status: 400 })

  const username = dbUser.username
  const headers = makeHeaders()

  const [userRes, reposRes, eventsRes, readmeRes] = await Promise.allSettled([
    fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}/repos?type=public&sort=updated&per_page=30`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}/events/public?per_page=30`, { headers, signal: AbortSignal.timeout(8000) }),
    fetch(`${GITHUB_API}/repos/${encodeURIComponent(username)}/${encodeURIComponent(username)}/readme`, { headers, signal: AbortSignal.timeout(5000) }),
  ])

  const ghUser = userRes.status === 'fulfilled' && userRes.value.ok
    ? (await userRes.value.json() as { public_repos?: number; bio?: string; company?: string; location?: string })
    : null

  const rawRepos: GHRepo[] = reposRes.status === 'fulfilled' && reposRes.value.ok
    ? await reposRes.value.json()
    : []

  const rawEvents: GHEvent[] = eventsRes.status === 'fulfilled' && eventsRes.value.ok
    ? await eventsRes.value.json()
    : []

  const readmeData = readmeRes.status === 'fulfilled' && readmeRes.value.ok
    ? await readmeRes.value.json() as { content?: string }
    : null

  const publicRepos = ghUser?.public_repos ?? rawRepos.length

  if (publicRepos === 0 && rawRepos.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: 'no_public_repos',
      publicRepos: 0,
      message: 'No public repositories found. Your GitHub may be private or empty. You can still auto-sync via the GitHub Actions token in Settings → Connections.',
    })
  }

  // Decode profile README (first 1500 chars is enough for skill signals)
  let readme = ''
  if (readmeData?.content) {
    try { readme = Buffer.from(readmeData.content, 'base64').toString('utf-8').slice(0, 1500) }
    catch { /* ignore */ }
  }

  const repos = rawRepos.filter((r) => !r.fork).slice(0, 20)

  const repoSummary = repos
    .map((r) =>
      `- ${r.name} (${r.language || 'unknown'}${r.stargazers_count ? `, ${r.stargazers_count}★` : ''}): ${r.description || 'no description'}${r.topics?.length ? ` [${r.topics.slice(0, 3).join(', ')}]` : ''}`
    )
    .join('\n')

  const eventLines: string[] = []
  for (const evt of rawEvents.slice(0, 20)) {
    if (evt.type === 'PushEvent') {
      const msgs = (evt.payload?.commits || [])
        .slice(0, 2)
        .map((c) => c.message.split('\n')[0])
        .join('; ')
      if (msgs) eventLines.push(`Pushed to ${evt.repo?.name}: ${msgs}`)
    } else if (evt.type === 'PullRequestEvent' && evt.payload?.pull_request) {
      eventLines.push(`PR: ${evt.payload.pull_request.title} in ${evt.repo?.name}`)
    } else if (evt.type === 'IssuesEvent' && evt.payload?.issue) {
      eventLines.push(`Issue: ${evt.payload.issue.title} in ${evt.repo?.name}`)
    }
  }

  const prompt = `${SYNC_PROMPT}

Username: ${username}
Bio: ${ghUser?.bio || '(none)'}
Company: ${ghUser?.company || '(none)'}
Public repos: ${publicRepos}

Recent public repos:
${repoSummary || '(none)'}

Recent activity (last 30 public events):
${eventLines.slice(0, 10).join('\n') || '(no recent public activity)'}

Profile README excerpt:
${readme || '(no profile README)'}`

  let analysis: {
    skills?: {
      name: string
      evidence: string[]
      evidenceCount?: number
      repoComplexity?: number
      recencyMonths?: number
    }[]
    targetRole?: string
    activitySummary?: string
  } = {}

  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt,
      maxOutputTokens: 1200,
    })
    const match = text.match(/\{[\s\S]*\}/)
    if (match) analysis = JSON.parse(match[0])
  } catch (err) {
    console.error('[github-sync] AI extraction failed:', err)
  }

  const profile = await Profile.findOne({ userId: session.user.id })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Merge skills: preserve signals from other sources, replace GitHub-derived ones
  const incomingSkills = (analysis.skills || []).filter((s) => s.name)
  const incomingNames = new Set(incomingSkills.map((s) => s.name.toLowerCase()))

  const preserved = (profile.parsedSkills as { name: string }[]).filter(
    (s) => !incomingNames.has(s.name.toLowerCase())
  )

  const now = new Date()
  const newSkills = incomingSkills.map((skill) => {
    const proofScore = calculateProofScore({
      evidenceCount: skill.evidenceCount ?? repos.length,
      repoComplexity: skill.repoComplexity ?? 55,
      recencyMonths: skill.recencyMonths ?? 3,
    })
    return {
      name: skill.name,
      evidence: skill.evidence || [],
      proofScore,
      lastUpdated: now,
      scoreHistory: [{ score: proofScore, source: 'github', at: now }],
    }
  })

  profile.parsedSkills = [...preserved, ...newSkills]

  // Refresh projects from latest repos
  const updatedProjects = repos.map((r) => ({
    repoName: r.name,
    description: r.description || '',
    language: r.language || 'Unknown',
    stars: r.stargazers_count || 0,
    githubUrl: `https://github.com/${username}/${r.name}`,
    techStack: [r.language, ...(r.topics || [])]
      .filter(Boolean)
      .map((t) => (t as string).charAt(0).toUpperCase() + (t as string).slice(1))
      .slice(0, 5),
    complexityScore: 50,
    readmeSummary: '',
  }))

  if (updatedProjects.length > 0) profile.projects = updatedProjects

  // Store activity summary — Atlas reads this in chat context
  if (analysis.activitySummary) profile.githubActivitySummary = analysis.activitySummary

  // Fill empty profile fields from GitHub data
  if (ghUser?.bio && !profile.bio) profile.bio = ghUser.bio
  if (ghUser?.location && !profile.location) profile.location = ghUser.location
  if (analysis.targetRole && !profile.targetRole) profile.targetRole = analysis.targetRole

  profile.updatedAt = now
  await profile.save()

  return NextResponse.json({
    ok: true,
    publicRepos,
    skillsAdded: newSkills.length,
    projectsUpdated: updatedProjects.length,
    activitySummary: analysis.activitySummary || '',
    message: `Synced ${publicRepos} public repos — ${newSkills.length} skills updated, ${updatedProjects.length} projects refreshed.`,
  })
}
