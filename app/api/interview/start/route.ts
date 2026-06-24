import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'
import { fetchGitHubRepos, reposToSummary } from '@/lib/github'
import { generateText } from 'ai'
import { getCandidateMemory } from '@/lib/memory'

const FORMAT_PROMPTS: Record<string, string> = {
  coding:
    "Start a live coding interview. Present one focused coding challenge (data structures, algorithms, or system-level) relevant to the candidate's background. State the problem clearly with examples.",
  system_design:
    "Start a system design interview. Choose a real-world system relevant to their experience (e.g., design a URL shortener, rate limiter, or notification service) and ask them to walk through their approach.",
  project_deepdive:
    "Start a project deep-dive. Pick the candidate's most technically interesting project from their GitHub repos. Ask them to explain the architecture, challenges they faced, and key technical decisions.",
  behavioural:
    "Start a behavioural interview using the STAR framework. Ask about a specific challenging technical situation — a difficult bug, a team conflict, a time they had to learn something fast.",
  gap: "Start a focused 10-minute gap session on the target skill. Start with a diagnostic question to assess current knowledge level, then probe deeper into concepts they might be weak on.",
  pm_case:
    "Start a Product Manager case study interview. Do NOT mention code or technical implementation. Set up a realistic product scenario relevant to the candidate's target skill (e.g. 'You're the PM for Google Maps — daily active users dropped 15% last month. Walk me through how you'd diagnose and address this.'). Begin with this opening scenario and ask them to start by defining the problem.",
  design_critique:
    "Start a UX/Design critique interview. Do NOT mention code. Describe a real product scenario in text (e.g. 'You're reviewing the onboarding flow of a fintech app targeting first-time investors in Tier-2 cities. The drop-off rate at step 3 is 60%.'). Ask the candidate to identify UX issues and walk through how they'd approach a redesign.",
  ops_case:
    "Start an Operations / Program Management case interview. Do NOT mention code. Present a real-world operational challenge (e.g. 'You're the ops lead for a food delivery startup expanding to a new city. Launch is in 6 weeks. Walk me through how you'd plan it.'). Ask them to start by identifying key workstreams and risks.",
  sales_discovery:
    "Start a Sales / Customer Success discovery interview. Do NOT mention code. Roleplay a scenario: 'I'm the CTO of a 200-person SaaS company. We're having trouble retaining enterprise customers past year one — churn is at 25%. I have 20 minutes.' Begin the discovery conversation and assess their ability to uncover the real problem before pitching anything.",
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { format, targetSkill, companyJD, rigorConditions, companyTrackId, roundIndex } = await req.json()
    await connectDB()

    const user = await User.findById(session.user.id)
    const profile = await Profile.findOne({ userId: user?._id })

    // Get project context + candidate memory
    // GitHub-auth users: fetch live repos. Twitter-auth users: use stored activity summary.
    const isGithubUser = user?.authProvider === 'github' || !!user?.githubId
    const [repos, memoryContext] = await Promise.all([
      isGithubUser && user?.username ? fetchGitHubRepos(user.username) : Promise.resolve([]),
      getCandidateMemory(session.user.id),
    ])

    const twitterSummary = (profile as unknown as { twitterActivitySummary?: string })?.twitterActivitySummary
    let repoSummary: string
    if (repos.length > 0) {
      repoSummary = reposToSummary(repos)
    } else if (twitterSummary) {
      repoSummary = `X/Twitter activity: ${twitterSummary}`
    } else {
      repoSummary = 'No external project data available yet.'
    }

    // Skill scores from profile
    const skillContext =
      profile?.parsedSkills
        ?.slice(0, 6)
        .map((s: { name: string; proofScore: number }) => `- ${s.name}: ${s.proofScore}/100`)
        .join('\n') || 'No skill scores yet.'

    // Company mode: analyze JD if provided
    let companyModeData: { jdSnippet: string; style: string; company: string } | undefined
    let companyAddition = ''
    if (companyJD && typeof companyJD === 'string' && companyJD.trim().length > 20) {
      const { analyzeCompanyStyle } = await import('@/lib/company-mode')
      const style = await analyzeCompanyStyle(companyJD)
      companyModeData = style
      companyAddition = `\n\n[COMPANY MODE]\n${style.style}`
    }

    const prompt = `
${FORMAT_PROMPTS[format] || FORMAT_PROMPTS.coding}

Candidate profile:
- Name: ${user?.name || 'Candidate'}
- Target skill for this session: ${targetSkill}
- Target role: ${profile?.targetRole || 'Software Engineer'}
- Years of experience: ${profile?.yearsOfExperience || 'unknown'}

GitHub repositories:
${repoSummary}

Skill proof scores:
${skillContext}
${memoryContext}${companyAddition}
Start the interview now with your opening question. Be specific to their actual projects/skills.`

    const { text: openingQuestion } = await generateText({
      model: await getModel(),
      system: INTERVIEW_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 500,
    })

    const interviewSession = await InterviewSession.create({
      userId: user?._id,
      format,
      targetSkill,
      status: 'in_progress',
      messages: [
        {
          role: 'ai',
          content: openingQuestion,
          timestamp: new Date(),
          hintsUsed: 0,
        },
      ],
      githubContext: repoSummary.slice(0, 2000),
      memoryContext,
      ...(companyModeData ? { companyMode: companyModeData } : {}),
      ...(rigorConditions ? { rigorConditions: { ...rigorConditions, capturedAt: new Date() } } : {}),
      ...(companyTrackId ? { metadata: { companyTrackId, roundIndex: roundIndex ?? 0 } } : {}),
    })

    return NextResponse.json({
      sessionId: interviewSession._id,
      openingMessage: openingQuestion,
    })
  } catch (error) {
    console.error('Interview start error:', error)
    return NextResponse.json({ error: 'Failed to start interview' }, { status: 500 })
  }
}
