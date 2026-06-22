import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { Handshake } from '@/lib/models/Handshake'
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

  const [user, profile, handshakes] = await Promise.all([
    User.findById(session.user.id)
      .select('name discoverability preferences subscriptionTier subscriptionStatus')
      .lean() as Promise<{ name: string; discoverability: string; preferences?: Record<string, unknown>; subscriptionTier?: string; subscriptionStatus?: string } | null>,
    Profile.findOne({ userId: session.user.id })
      .select('parsedSkills targetRole cohortPercentile')
      .lean() as Promise<{ parsedSkills: { name: string; proofScore: number }[]; targetRole: string; cohortPercentile: number } | null>,
    Handshake.find({
      candidateId: session.user.id,
      status: { $in: ['surfaced_to_candidate', 'connected'] },
    }).select('roleTitle company verdict status').lean(),
  ])

  const topSkills = (profile?.parsedSkills || [])
    .sort((a, b) => b.proofScore - a.proofScore)
    .slice(0, 8)
    .map((s) => `${s.name}: ${s.proofScore}/100`)
    .join(', ')

  const pendingOps = handshakes
    .filter((h) => h.status === 'surfaced_to_candidate')
    .map((h) => `${h.roleTitle}${(h as { company?: string }).company ? ` @ ${(h as { company: string }).company}` : ''} (${(h as { verdict?: { score: number } }).verdict?.score ?? '?'}% fit)`)
    .join('; ')

  const candidateContext = [
    `Candidate: ${user?.name || 'Engineer'}`,
    `Target role: ${profile?.targetRole || 'Software Engineer'}`,
    `Cohort: top ${100 - (profile?.cohortPercentile || 50)}%`,
    `Top skills: ${topSkills || 'none yet'}`,
    `Discoverability: ${user?.discoverability || 'open'}`,
    pendingOps ? `Pending opportunities (surfaced by Atlas): ${pendingOps}` : 'No pending opportunities right now',
    user?.preferences?.minCompLpa ? `Min comp preference: ₹${user.preferences.minCompLpa}L` : '',
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
