import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'
import { streamText } from 'ai'
import { buildAssessDirective } from '@/lib/assessment-interview'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; roundOrder: string }> }
) {
  const { token, roundOrder: roundOrderStr } = await params
  const roundOrder = parseInt(roundOrderStr, 10)

  const { sessionId, message, isHint = false, code, codeOutput, language } = await req.json()

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

    let userMessage = isHint
      ? `[HINT REQUEST] The candidate is stuck and needs a hint. Give a Socratic nudge — ask a guiding question without revealing the answer.`
      : message

    // Pillar 3 — real coding signal: candidate submitted executed code.
    if (code) {
      userMessage += `\n\n[CODE SUBMISSION]\nLanguage: ${language || 'unknown'}\n\`\`\`${language || ''}\n${code}\n\`\`\`\nExecution output:\n${codeOutput || '(not executed)'}\n\nEvaluate this code: is the logic correct? Does it handle edge cases? What would you improve?`
    }

    // Pillar 2 — standardized competency coverage + adaptive difficulty + coding protocol.
    const directive = buildAssessDirective({
      format: interviewSession.format,
      role: interviewSession.targetSkill || 'the role',
    })

    const contextualSystem = INTERVIEW_SYSTEM_PROMPT + directive

    const result = streamText({
      model: await getModel(),
      system: contextualSystem,
      messages: [...historyMessages, { role: 'user', content: userMessage }],
      maxOutputTokens: 500,
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
          if (code) {
            const scoreMatch = text.match(/\*\*[Cc]orrectness[:\s]+(\d+(?:\.\d+)?)\s*\/\s*10\*\*/i)
            const codeScore = scoreMatch ? Math.min(10, Math.max(0, parseFloat(scoreMatch[1]))) : undefined
            interviewSession.codeSubmissions.push({
              language: language || 'unknown',
              code,
              judge0Output: codeOutput || '',
              ...(codeScore !== undefined && { codeScore }),
              timestamp: new Date(),
            })
          }
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
