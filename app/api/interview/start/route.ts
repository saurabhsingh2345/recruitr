import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'
import { fetchGitHubRepos, reposToSummary } from '@/lib/github'
import { generateText } from 'ai'

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
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { format, targetSkill } = await req.json()
    await connectDB()

    const user = await User.findById(session.user.id)
    const profile = await Profile.findOne({ userId: user?._id })

    // Get fresh GitHub repos for personalization
    const repos = user?.username ? await fetchGitHubRepos(user.username) : []
    const repoSummary = repos.length > 0 ? reposToSummary(repos) : 'No GitHub data available.'

    // Skill scores from profile
    const skillContext =
      profile?.parsedSkills
        ?.slice(0, 6)
        .map((s: { name: string; proofScore: number }) => `- ${s.name}: ${s.proofScore}/100`)
        .join('\n') || 'No skill scores yet.'

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
