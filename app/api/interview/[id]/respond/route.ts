import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'
import { streamText } from 'ai'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { message, isHint = false } = await req.json()

  try {
    await connectDB()

    const interviewSession = await InterviewSession.findOne({
      _id: id,
      userId: session.user.id,
      status: 'in_progress',
    })

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Build message history for context
    const historyMessages = interviewSession.messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }))

    const userMessage = isHint
      ? `[HINT REQUEST] The candidate is stuck and needs a hint. Give a Socratic nudge — ask a guiding question without revealing the answer.`
      : message

    // Enrich system prompt with session context
    const contextualSystem = [
      INTERVIEW_SYSTEM_PROMPT,
      interviewSession.githubContext
        ? `\nCandidate GitHub context:\n${interviewSession.githubContext}`
        : '',
      `\nInterview format: ${interviewSession.format}`,
      `Target skill: ${interviewSession.targetSkill}`,
    ]
      .filter(Boolean)
      .join('\n')

    const result = streamText({
      model: await getModel(),
      system: contextualSystem,
      messages: [
        ...historyMessages,
        { role: 'user', content: userMessage },
      ],
      maxOutputTokens: 400,
      onFinish: async ({ text }) => {
        interviewSession.messages.push({
          role: 'candidate',
          content: message,
          timestamp: new Date(),
          hintsUsed: isHint ? 1 : 0,
        })
        interviewSession.messages.push({
          role: 'ai',
          content: text,
          timestamp: new Date(),
          hintsUsed: 0,
        })
        await interviewSession.save()
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Interview respond error:', error)
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 })
  }
}
