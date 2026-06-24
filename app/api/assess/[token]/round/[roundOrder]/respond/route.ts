import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'
import { streamText } from 'ai'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; roundOrder: string }> }
) {
  const { token, roundOrder: roundOrderStr } = await params
  const roundOrder = parseInt(roundOrderStr, 10)

  const { sessionId, message, isHint = false } = await req.json()

  try {
    await connectDB()

    const invite = await AssessmentInvite.findOne({ token })
    if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

    const round = invite.rounds.find((r: { roundOrder: number }) => r.roundOrder === roundOrder)
    if (!round || round.sessionId?.toString() !== sessionId) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
    }

    const interviewSession = await InterviewSession.findOne({
      _id: sessionId,
      assessmentInviteId: invite._id,
      status: 'in_progress',
    })

    if (!interviewSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const historyMessages = interviewSession.messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }))

    const userMessage = isHint
      ? `[HINT REQUEST] The candidate is stuck and needs a hint. Give a Socratic nudge — ask a guiding question without revealing the answer.`
      : message

    const contextualSystem = [
      INTERVIEW_SYSTEM_PROMPT,
      `\nInterview format: ${interviewSession.format}`,
      `Target skill: ${interviewSession.targetSkill}`,
    ].join('\n')

    const result = streamText({
      model: await getModel(),
      system: contextualSystem,
      messages: [...historyMessages, { role: 'user', content: userMessage }],
      maxOutputTokens: 400,
      onFinish: async ({ text }) => {
        try {
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
        } catch (err) {
          console.error('Failed to persist messages:', err)
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Assessment respond error:', error)
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 })
  }
}
