import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel, PROFILE_GENERATION_PROMPT } from '@/lib/groq'
import { calculateProofScore, calculateCohortPercentile } from '@/lib/scoring'
import { fetchGitHubRepos, reposToSummary } from '@/lib/github'
import { generateText } from 'ai'
import { checkWatchlistAlerts } from '@/lib/watchlist'
import { enqueueAutonomousSourcing } from '@/lib/queues/autonomousSourcing'

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const user = await User.findById(session.user.id)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const profile = await Profile.findOne({ userId: user._id })
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Fetch GitHub repos directly — no Python parser needed
    const repos = user.username ? await fetchGitHubRepos(user.username) : []
    const repoSummary = reposToSummary(repos)

    // Store repos in profile
    if (repos.length > 0) {
      profile.projects = repos
    }

    const inputText = `
GitHub Username: ${user.username}

GITHUB REPOS:
${repoSummary}

RESUME TEXT:
${profile.rawResumeText || 'No resume uploaded yet.'}
    `.trim()

    const { text } = await generateText({
      model: await getModel(),
      system: PROFILE_GENERATION_PROMPT,
      prompt: inputText,
      maxOutputTokens: 2000,
    })

    let parsed: {
      skills?: Array<{ name: string; evidence: string[]; confidence: number }>
      targetRole?: string
      yearsOfExperience?: number
      bio?: string
    } | null = null

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      console.error('JSON parse error in profile generation')
    }

    if (parsed?.skills && parsed.skills.length > 0) {
      const now = new Date()
      const incoming = parsed.skills.map((s) => {
        const score = calculateProofScore({
          evidenceCount: s.evidence?.length || 1,
          repoComplexity: s.confidence || 60,
          recencyMonths: 2,
        })
        return {
          name: s.name,
          evidence: s.evidence,
          proofScore: score,
          lastUpdated: now,
          scoreHistory: [{ score, source: 'github', at: now }],
        }
      })

      // Merge: update/add GitHub-derived skills without wiping skills from other sources
      const existing: typeof incoming = profile.parsedSkills as typeof incoming
      const incomingNames = new Set(incoming.map((s) => s.name.toLowerCase()))
      const preserved = existing.filter((s) => !incomingNames.has(s.name.toLowerCase()))
      profile.parsedSkills = [...preserved, ...incoming]
    }

    if (parsed?.targetRole) profile.targetRole = parsed.targetRole
    if (parsed?.yearsOfExperience) profile.yearsOfExperience = parsed.yearsOfExperience
    if (parsed?.bio) profile.bio = parsed.bio

    profile.updatedAt = new Date()
    await profile.save()

    // Recalculate cohortPercentile now that skills are set
    try {
      const allProfiles = await Profile.find({ isPublic: true }).select('parsedSkills').lean()
      const allScores = allProfiles.map((p) => {
        const sk = (p.parsedSkills as { proofScore: number }[]) || []
        return sk.length ? sk.reduce((s, x) => s + x.proofScore, 0) / sk.length : 0
      })
      const mySkills = profile.parsedSkills as { proofScore: number }[]
      const myScore = mySkills.length
        ? mySkills.reduce((s, x) => s + x.proofScore, 0) / mySkills.length
        : 0
      profile.cohortPercentile = calculateCohortPercentile(myScore, allScores)
      await profile.save()
    } catch {
      // Non-fatal
    }

    // Fire-and-forget: watchlist alerts + autonomous sourcing
    const updatedSkills = profile.parsedSkills.map((s: { name: string; proofScore: number }) => ({
      name: s.name,
      newScore: s.proofScore,
    }))
    checkWatchlistAlerts(session.user.id, updatedSkills).catch(() => {})
    enqueueAutonomousSourcing(session.user.id, updatedSkills.map((s: { name: string }) => s.name)).catch(() => {})

    return NextResponse.json({
      success: true,
      skillsCount: profile.parsedSkills.length,
      projectsCount: profile.projects.length,
    })
  } catch (error) {
    console.error('Profile generation error:', error)
    return NextResponse.json({ error: 'Failed to generate profile' }, { status: 500 })
  }
}
