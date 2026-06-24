import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { Assessment } from '@/lib/models/Assessment'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'
import { computeVerdict, computeCompositeScore } from '@/lib/assessment'
import { buildGapsWithNextSteps, suggestNextSession } from '@/lib/interview-insights'

const FORMAT_RUBRICS: Record<string, { axes: Record<string, string>; expertLabel: string }> = {
  coding:          { axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', code_quality: 'code_quality' }, expertLabel: 'expert engineer' },
  system_design:   { axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', design_quality: 'design_quality' }, expertLabel: 'staff engineer' },
  project_deepdive:{ axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', code_quality: 'ownership_signal' }, expertLabel: 'senior engineer' },
  behavioural:     { axes: { technical_depth: 'situation_clarity', problem_solving: 'action_quality', communication: 'communication', code_quality: 'impact_articulation' }, expertLabel: 'senior engineer' },
  gap:             { axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', code_quality: 'concept_clarity' }, expertLabel: 'expert engineer' },
  pm_case:         { axes: { technical_depth: 'problem_framing', problem_solving: 'prioritization_logic', communication: 'communication', code_quality: 'insight_quality' }, expertLabel: 'senior PM' },
  design_critique: { axes: { technical_depth: 'ux_reasoning', problem_solving: 'systems_thinking', communication: 'communication', code_quality: 'design_rationale' }, expertLabel: 'senior designer' },
  ops_case:        { axes: { technical_depth: 'process_design', problem_solving: 'resource_allocation', communication: 'communication', code_quality: 'risk_identification' }, expertLabel: 'senior ops lead' },
  sales_discovery: { axes: { technical_depth: 'discovery_quality', problem_solving: 'objection_handling', communication: 'communication', code_quality: 'value_articulation' }, expertLabel: 'senior AE' },
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; roundOrder: string }> }
) {
  const { token, roundOrder: roundOrderStr } = await params
  const roundOrder = parseInt(roundOrderStr, 10)

  const { sessionId } = await req.json()

  try {
    await connectDB()

    const invite = await AssessmentInvite.findOne({ token })
    if (!invite) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

    const inviteRoundIdx = invite.rounds.findIndex((r: { roundOrder: number }) => r.roundOrder === roundOrder)
    if (inviteRoundIdx === -1) return NextResponse.json({ error: 'Round not found' }, { status: 404 })

    const inviteRound = invite.rounds[inviteRoundIdx]
    if (inviteRound.sessionId?.toString() !== sessionId) {
      return NextResponse.json({ error: 'Session mismatch' }, { status: 403 })
    }

    const interviewSession = await InterviewSession.findOne({
      _id: sessionId,
      assessmentInviteId: invite._id,
    })
    if (!interviewSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    // If already completed (e.g. double-submit), just return current state
    if (interviewSession.status === 'completed' && inviteRound.status === 'completed') {
      return NextResponse.json({ invite, sessionId })
    }

    // Score the session
    const transcript = interviewSession.messages
      .map((m: { role: string; content: string }) =>
        `${m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
      .join('\n\n')

    const rubric = FORMAT_RUBRICS[interviewSession.format] || FORMAT_RUBRICS.coding
    const breakdownKeys = Object.entries(rubric.axes).map(([, v]) => `"${v}": <0-100>`).join(',\n    ')

    const questions = interviewSession.messages
      .filter((m: { role: string; content: string }) => m.role === 'ai' && m.content.includes('?'))
      .slice(0, 5)
      .map((m: { content: string }) => {
        const sentences = m.content.split(/[.!]/).filter((s) => s.includes('?'))
        return sentences[0]?.trim() || m.content.slice(0, 120)
      })

    const analysisPrompt = `Analyze this interview transcript and generate a structured assessment.

Interview format: ${interviewSession.format}
Target skill: ${interviewSession.targetSkill}

TRANSCRIPT:
${transcript.slice(0, 3000)}

Return ONLY valid JSON (no markdown, no code fences):
{
  "overallScore": <0-100 integer>,
  "breakdown": {
    ${breakdownKeys}
  },
  "strengths": ["<specific strength>", "<strength>"],
  "gaps": ["<gap>", "<gap>"],
  "studyRecommendations": ["<recommendation>"],
  "idealAnswers": {
    ${questions.map((q: string, i: number) => `"${q || `Question ${i + 1}`}": "<expert answer>"`).join(',\n    ')}
  }
}`

    let analysis: {
      overallScore: number
      breakdown: Record<string, number>
      strengths: string[]
      gaps: string[]
      studyRecommendations: string[]
      idealAnswers: Record<string, string> | { question: string; answer: string }[]
    }

    try {
      const { text } = await generateText({
        model: await getModel(),
        prompt: analysisPrompt,
        maxOutputTokens: 1200,
      })
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      analysis = null as unknown as typeof analysis
    }

    if (!analysis) {
      const fallbackBreakdown = Object.fromEntries(
        Object.values(rubric.axes).map((key) => [key, 65])
      )
      analysis = {
        overallScore: 65,
        breakdown: fallbackBreakdown,
        strengths: ['Clear communication'],
        gaps: ['Could provide more depth'],
        studyRecommendations: ['Practice more in this area'],
        idealAnswers: [],
      }
    }

    const normalizedIdealAnswers = (() => {
      const raw = analysis.idealAnswers
      if (!raw) return []
      if (Array.isArray(raw)) {
        return (raw as { question?: string; answer?: string }[])
          .filter((item) => item?.question)
          .map((item) => ({ question: item.question!, answer: String(item.answer ?? '') }))
      }
      return Object.entries(raw as Record<string, string>).map(([question, answer]) => ({
        question,
        answer: String(answer),
      }))
    })()

    const gaps = analysis.gaps || []

    interviewSession.status = 'completed'
    interviewSession.completedAt = new Date()
    interviewSession.scores = {
      overall: analysis.overallScore,
      breakdown: analysis.breakdown,
      delta: {},
    }
    interviewSession.insightReport = {
      strengths: analysis.strengths || [],
      gaps,
      gapsWithNextSteps: buildGapsWithNextSteps(gaps),
      idealAnswers: normalizedIdealAnswers,
      studyRecommendations: analysis.studyRecommendations || [],
      aiVerdict: '',
      weaknessSignals: [],
      nextSessionRec: suggestNextSession(interviewSession.targetSkill, interviewSession.format, analysis.overallScore, gaps[0] || null),
      progressionSignal: '',
      specializationImpact: '',
      generatedAt: new Date(),
    }
    await interviewSession.save()

    // Update invite round
    invite.rounds[inviteRoundIdx].status = 'completed'
    invite.rounds[inviteRoundIdx].completedAt = new Date()
    invite.rounds[inviteRoundIdx].score = analysis.overallScore
    invite.rounds[inviteRoundIdx].breakdown = analysis.breakdown

    // Recompute composite score
    type RoundShape = { status: string; score?: number; roundOrder: number }
    const completedScores = invite.rounds
      .filter((r: RoundShape) => r.status === 'completed' && typeof r.score === 'number')
      .map((r: RoundShape) => r.score as number)
    invite.compositeScore = computeCompositeScore(completedScores)
    invite.verdict = computeVerdict(invite.compositeScore)

    // Check if all rounds done
    const assessment = await Assessment.findById(invite.assessmentId).lean()
    const totalRounds = assessment?.rounds?.length || 0
    const completedRounds = invite.rounds.filter((r: RoundShape) => r.status === 'completed').length

    if (completedRounds >= totalRounds) {
      invite.status = 'completed'
      invite.completedAt = new Date()

      // Generate verdict reason
      const scoresSummary = invite.rounds
        .filter((r: RoundShape) => r.status === 'completed')
        .map((r: RoundShape) => `Round ${r.roundOrder}: ${r.score}/100`)
        .join(', ')
      const verdictLabel = invite.verdict === 'strong_hire' ? 'Strong Hire'
        : invite.verdict === 'hire' ? 'Hire'
        : invite.verdict === 'maybe' ? 'Maybe'
        : 'No Hire'

      try {
        const { text: verdictReason } = await generateText({
          model: await getModel(),
          prompt: `In one sentence, explain why this candidate received a "${verdictLabel}" verdict based on these round scores: ${scoresSummary}. Composite score: ${invite.compositeScore}/100. Be specific and actionable.`,
          maxOutputTokens: 80,
        })
        invite.verdictReason = verdictReason.trim().slice(0, 200)
      } catch {
        invite.verdictReason = `Candidate scored ${invite.compositeScore}/100 across all rounds.`
      }
    }

    await invite.save()

    return NextResponse.json({
      invite,
      sessionId,
      overallScore: analysis.overallScore,
      breakdown: analysis.breakdown,
    })
  } catch (error) {
    console.error('Assessment round complete error:', error)
    return NextResponse.json({ error: 'Failed to complete round' }, { status: 500 })
  }
}
