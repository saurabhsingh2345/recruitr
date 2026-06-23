import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { Handshake } from '@/lib/models/Handshake'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { getModel } from '@/lib/groq'

interface ChatMessage {
  role: 'user' | 'atlas'
  content: string
}

const ATLAS_SYSTEM = `You are Atlas, the candidate's personal AI agent on Intervue. You work exclusively FOR the candidate — not for recruiters or the platform.

Your role:
- Coach the candidate on their proof-of-skill journey
- Explain their scores, what they mean, and how to improve them
- Summarize and explain recruiter handshakes (match quality, role details)
- Give honest, actionable advice — never vague platitudes
- Be concise: 2-4 sentences unless the user asks for more detail
- You have full access to the candidate's verified skill scores and pending opportunities

Tone: Direct, warm, knowledgeable — like a trusted senior engineer who is on your side.
Never roleplay as a recruiter or pretend to be a different AI.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, history = [] } = (await req.json()) as { message: string; history: ChatMessage[] }
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, profile, handshakes, recentSessions] = await Promise.all([
    User.findById(session.user.id)
      .select('name discoverability preferences subscriptionTier subscriptionStatus')
      .lean() as Promise<{ name: string; discoverability: string; preferences?: Record<string, unknown>; subscriptionTier?: string; subscriptionStatus?: string } | null>,
    Profile.findOne({ userId: session.user.id })
      .select('parsedSkills targetRole cohortPercentile projects experiences educations githubUsername bio yearsOfExperience githubActivitySummary twitterActivitySummary')
      .lean() as Promise<{
        parsedSkills: { name: string; proofScore: number }[]
        targetRole: string
        cohortPercentile: number
        projects: { repoName: string; description: string; techStack: string[]; language: string }[]
        experiences: { title: string; company: string; duration: string }[]
        educations: { institution: string; degree: string }[]
        githubUsername: string
        bio: string
        yearsOfExperience: number
        githubActivitySummary?: string
        twitterActivitySummary?: string
      } | null>,
    Handshake.find({
      candidateId: session.user.id,
      status: { $in: ['surfaced_to_candidate', 'connected'] },
    }).select('roleTitle company verdict status').lean(),
    InterviewSession.find(
      { userId: session.user.id, status: 'completed' },
      { targetSkill: 1, 'scores.overall': 1, 'insightReport.gaps': 1, 'insightReport.weaknessSignals': 1, completedAt: 1 }
    ).sort({ completedAt: -1 }).limit(5).lean(),
  ])

  const topSkills = (profile?.parsedSkills || [])
    .sort((a, b) => b.proofScore - a.proofScore)
    .slice(0, 10)
    .map((s) => `${s.name}: ${s.proofScore}/100`)
    .join(', ')

  const pendingOps = handshakes
    .filter((h) => h.status === 'surfaced_to_candidate')
    .map((h) => `${h.roleTitle}${(h as { company?: string }).company ? ` @ ${(h as { company: string }).company}` : ''} (${(h as { verdict?: { score: number } }).verdict?.score ?? '?'}% fit)`)
    .join('; ')

  const projects = (profile?.projects || []).slice(0, 5)
    .map((p) => `${p.repoName} (${p.language || 'unknown'}): ${p.description || 'no description'}${p.techStack?.length ? ` [${p.techStack.slice(0, 4).join(', ')}]` : ''}`)
    .join('\n')

  const experiences = (profile?.experiences || []).slice(0, 3)
    .map((e) => `${e.title} at ${e.company}${e.duration ? ` (${e.duration})` : ''}`)
    .join('; ')

  const educations = (profile?.educations || []).slice(0, 2)
    .map((e) => `${e.degree} at ${e.institution}`)
    .join('; ')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionSummary = (recentSessions as any[]).map((s) =>
    `${s.targetSkill}: ${s.scores?.overall ?? '?'}/100${s.insightReport?.gaps?.length ? ` — gaps: ${s.insightReport.gaps.slice(0, 2).join('; ')}` : ''}`
  ).join('\n')

  // Gather recurring weakness topics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weaknessTopics = Array.from(new Set((recentSessions as any[]).flatMap((s) =>
    (s.insightReport?.weaknessSignals ?? []).map((w: { topic: string }) => w.topic)
  ))).slice(0, 5).join('; ')

  const candidateContext = [
    `Candidate: ${user?.name || 'Engineer'}`,
    profile?.bio ? `Bio: ${profile.bio}` : '',
    `Years of experience: ${profile?.yearsOfExperience || 'unknown'}`,
    `Target role: ${profile?.targetRole || 'Software Engineer'}`,
    `Cohort: top ${100 - (profile?.cohortPercentile || 50)}%`,
    experiences ? `Work experience: ${experiences}` : '',
    educations ? `Education: ${educations}` : '',
    `All skills: ${topSkills || 'none yet'}`,
    projects ? `GitHub projects:\n${projects}` : (profile?.githubUsername ? `GitHub: ${profile.githubUsername}` : ''),
    sessionSummary ? `Recent sessions (last 5):\n${sessionSummary}` : '',
    weaknessTopics ? `Recurring weak areas: ${weaknessTopics}` : '',
    `Discoverability: ${user?.discoverability || 'open'}`,
    pendingOps ? `Pending opportunities (surfaced by Atlas): ${pendingOps}` : 'No pending opportunities right now',
    user?.preferences?.minCompLpa ? `Min comp preference: ₹${user.preferences.minCompLpa}L` : '',
    profile?.githubActivitySummary ? `Recent GitHub activity: ${profile.githubActivitySummary}` : '',
    profile?.twitterActivitySummary ? `Recent X/Twitter activity: ${profile.twitterActivitySummary}` : '',
  ].filter(Boolean).join('\n')

  const systemWithContext = `${ATLAS_SYSTEM}\n\n--- Candidate Context ---\n${candidateContext}`

  const prior = history.slice(-10).map((m) => ({
    role: (m.role === 'atlas' ? 'assistant' : 'user') as 'assistant' | 'user',
    content: m.content,
  }))

  try {
    const model = await getModel()
    const { text } = await generateText({
      model,
      system: systemWithContext,
      messages: [...prior, { role: 'user', content: message }],
      maxOutputTokens: 400,
      temperature: 0.7,
    })

    return NextResponse.json({ reply: text.trim() })
  } catch (err) {
    console.error('[atlas/chat] LLM error:', err)
    return NextResponse.json({
      reply: "I'm having trouble connecting right now. Check your skills on the dashboard and try again in a moment.",
    })
  }
}
