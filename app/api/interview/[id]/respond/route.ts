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
  const { message, isHint = false, code, codeOutput, language } = await req.json()

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

    let userMessage = isHint
      ? `[HINT REQUEST] The candidate is stuck and needs a hint. Give a Socratic nudge — ask a guiding question without revealing the answer.`
      : message

    if (code) {
      userMessage += `\n\n[CODE SUBMISSION]\nLanguage: ${language || 'unknown'}\n\`\`\`${language || ''}\n${code}\n\`\`\`\nExecution output:\n${codeOutput || '(not executed)'}\n\nEvaluate this code: is the logic correct? Does it handle edge cases? What would you improve?`
    }

    const isCodingFormat = ['coding', 'gap'].includes(interviewSession.format)
    const codingProtocol = isCodingFormat ? `

CODING INTERVIEW PROTOCOL:
- After each code submission and your feedback, immediately pose a NEW coding challenge. Vary difficulty (start easy, go harder).
- Each challenge must include: function signature, 1-2 input/output examples, constraints.
- When the candidate submits code via [CODE SUBMISSION], evaluate it in this order:
  1. State whether the core logic is correct or incorrect and why.
  2. Call out any missed edge cases (empty input, negatives, overflow, etc.).
  3. Comment on time and space complexity.
  4. On its own line, output exactly: **Correctness: X/10** (0 = completely wrong, 10 = optimal and handles all cases).
  5. Then pose the next challenge or ask them to optimize.
- If no code has been submitted yet after 2 exchanges, remind them the editor is available and they should write their solution.` : ''

    // Enrich system prompt with session context (memory + optional company mode)
    const contextualSystem = [
      INTERVIEW_SYSTEM_PROMPT,
      interviewSession.githubContext
        ? `\nCandidate GitHub context:\n${interviewSession.githubContext}`
        : '',
      `\nInterview format: ${interviewSession.format}`,
      `Target skill: ${interviewSession.targetSkill}`,
      interviewSession.memoryContext || '',
      interviewSession.companyMode?.style
        ? `\n[COMPANY MODE]\n${interviewSession.companyMode.style}`
        : '',
      codingProtocol,
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
    console.error('Interview respond error:', error)
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 })
  }
}
