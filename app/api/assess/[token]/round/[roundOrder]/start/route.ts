import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { Assessment } from '@/lib/models/Assessment'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { getModel, INTERVIEW_SYSTEM_PROMPT } from '@/lib/groq'
import { generateText } from 'ai'
import { buildAssessDirective } from '@/lib/assessment-interview'

const FORMAT_PROMPTS: Record<string, string> = {
  coding: "Start a live coding interview. Present one focused coding challenge relevant to the role. State the problem clearly with examples.",
  system_design: "Start a system design interview. Choose a real-world system and ask them to walk through their approach.",
  project_deepdive: "Start a project deep-dive interview. Ask about a relevant project and have them explain the architecture and key decisions.",
  behavioural: "Start a behavioural interview using the STAR framework. Ask about a specific challenging situation.",
  gap: "Start a focused gap session. Start with a diagnostic question to assess current knowledge level, then probe deeper.",
  pm_case: "Start a Product Manager case study interview. Set up a realistic product scenario. Do NOT mention code.",
  design_critique: "Start a UX/Design critique interview. Describe a real product scenario in text. Ask the candidate to identify UX issues. Do NOT mention code.",
  ops_case: "Start an Operations / Program Management case interview. Present a real-world operational challenge. Do NOT mention code.",
  sales_discovery: "Start a Sales / Customer Success discovery interview. Roleplay a scenario. Do NOT mention code.",
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; roundOrder: string }> }
) {
  const { token, roundOrder: roundOrderStr } = await params
  const roundOrder = parseInt(roundOrderStr, 10)
  await connectDB()

  const invite = await AssessmentInvite.findOne({ token })
  if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (invite.status === 'expired') return NextResponse.json({ error: 'Assessment expired' }, { status: 410 })
  if (!invite.candidateName) return NextResponse.json({ error: 'Please identify yourself first' }, { status: 400 })

  const assessment = await Assessment.findById(invite.assessmentId).lean()
  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })

  if (new Date(assessment.deadline) < new Date()) {
    invite.status = 'expired'
    await invite.save()
    return NextResponse.json({ error: 'Deadline has passed' }, { status: 410 })
  }

  // Check previous round is complete
  if (roundOrder > 1) {
    const prevRound = invite.rounds.find((r: { roundOrder: number; status: string }) => r.roundOrder === roundOrder - 1)
    if (!prevRound || prevRound.status !== 'completed') {
      return NextResponse.json({ error: 'Previous round not completed' }, { status: 400 })
    }
  }

  // Find this round config
  const roundConfig = assessment.rounds.find((r: { order: number }) => r.order === roundOrder)
  if (!roundConfig) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

  const inviteRoundIdx = invite.rounds.findIndex((r: { roundOrder: number }) => r.roundOrder === roundOrder)
  if (inviteRoundIdx === -1) return NextResponse.json({ error: 'Round not found in invite' }, { status: 404 })

  // If already in_progress, return existing session
  if (invite.rounds[inviteRoundIdx].status === 'in_progress' && invite.rounds[inviteRoundIdx].sessionId) {
    const existingSession = await InterviewSession.findById(invite.rounds[inviteRoundIdx].sessionId).lean()
    if (existingSession) {
      return NextResponse.json({
        sessionId: existingSession._id,
        openingMessage: existingSession.messages?.[0]?.content || '',
        format: roundConfig.format,
        durationMinutes: roundConfig.durationMinutes,
      })
    }
  }

  const formatPrompt = FORMAT_PROMPTS[roundConfig.format] || FORMAT_PROMPTS.coding
  const candidateContext = `Candidate name: ${invite.candidateName}. Role being assessed: ${assessment.role}.`
  const instructionContext = roundConfig.instructions
    ? `\n\nSpecific instructions for this round: ${roundConfig.instructions}`
    : ''

  const prompt = `${formatPrompt}

${candidateContext}${instructionContext}

Start the interview now with your opening question.`

  const directive = buildAssessDirective({
    format: roundConfig.format,
    role: assessment.role,
    instructions: roundConfig.instructions,
  })

  const { text: openingQuestion } = await generateText({
    model: await getModel(),
    system: INTERVIEW_SYSTEM_PROMPT + directive,
    prompt,
    maxOutputTokens: 500,
  })

  const session = await InterviewSession.create({
    format: roundConfig.format,
    targetSkill: assessment.role,
    status: 'in_progress',
    messages: [{ role: 'ai', content: openingQuestion, timestamp: new Date(), hintsUsed: 0 }],
    assessmentInviteId: invite._id,
    assessmentRoundOrder: roundOrder,
    githubContext: '',
    memoryContext: '',
  })

  invite.rounds[inviteRoundIdx].sessionId = session._id
  invite.rounds[inviteRoundIdx].status = 'in_progress'
  invite.rounds[inviteRoundIdx].startedAt = new Date()
  await invite.save()

  return NextResponse.json({
    sessionId: session._id,
    openingMessage: openingQuestion,
    format: roundConfig.format,
    durationMinutes: roundConfig.durationMinutes,
  })
}
