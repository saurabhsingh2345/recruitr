import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { AssessmentInvite } from '@/lib/models/AssessmentInvite'
import { Assessment } from '@/lib/models/Assessment'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { getModel } from '@/lib/groq'
import { generateText } from 'ai'
import {
  computeWeightedComposite,
  computeGatedVerdict,
  computeOverallConfidence,
  VERDICT_LABELS,
  type ScoredRound,
} from '@/lib/assessment'
import { scoreAssessmentRound } from '@/lib/assessment-scoring'
import { buildGapsWithNextSteps, suggestNextSession } from '@/lib/interview-insights'

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

    // Build the transcript and count real candidate turns (signal for confidence).
    const transcript = interviewSession.messages
      .map((m: { role: string; content: string }) =>
        `${m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
      .join('\n\n')
    const candidateTurns = interviewSession.messages.filter(
      (m: { role: string }) => m.role === 'candidate'
    ).length

    const assessment = await Assessment.findById(invite.assessmentId).lean()

    // Rubric-anchored, evidence-cited scoring (0-100 computed deterministically).
    const analysis = await scoreAssessmentRound({
      transcript,
      format: interviewSession.format,
      role: assessment?.role || 'the role',
      candidateTurns,
    })

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
      idealAnswers: analysis.idealAnswers || [],
      studyRecommendations: analysis.studyRecommendations || [],
      aiVerdict: '',
      weaknessSignals: [],
      nextSessionRec: suggestNextSession(interviewSession.targetSkill, interviewSession.format, analysis.overallScore, gaps[0] || null),
      progressionSignal: '',
      specializationImpact: '',
      generatedAt: new Date(),
    }
    await interviewSession.save()

    // Persist the full competency detail + confidence on the invite round.
    invite.rounds[inviteRoundIdx].status = 'completed'
    invite.rounds[inviteRoundIdx].completedAt = new Date()
    invite.rounds[inviteRoundIdx].score = analysis.overallScore
    invite.rounds[inviteRoundIdx].breakdown = analysis.breakdown
    invite.rounds[inviteRoundIdx].competencies = analysis.competencies
    invite.rounds[inviteRoundIdx].confidence = analysis.confidence

    // Recompute weighted composite + gated verdict + overall confidence.
    type RoundShape = {
      status: string
      score?: number
      roundOrder: number
      weight?: number
      confidence?: 'high' | 'medium' | 'low'
      competencies?: { rating: number; label?: string; evidence?: string }[]
    }
    const scoredRounds: ScoredRound[] = invite.rounds
      .filter((r: RoundShape) => r.status === 'completed' && typeof r.score === 'number')
      .map((r: RoundShape) => ({
        score: r.score as number,
        weight: r.weight ?? 1,
        confidence: r.confidence,
        minRating: r.competencies?.length
          ? Math.min(...r.competencies.map((c) => c.rating))
          : undefined,
      }))

    invite.compositeScore = computeWeightedComposite(scoredRounds)
    invite.verdict = computeGatedVerdict(invite.compositeScore, scoredRounds)
    invite.confidence = computeOverallConfidence(scoredRounds)

    // Check if all rounds done
    const totalRounds = assessment?.rounds?.length || 0
    const completedRounds = invite.rounds.filter((r: RoundShape) => r.status === 'completed').length

    if (completedRounds >= totalRounds) {
      invite.status = 'completed'
      invite.completedAt = new Date()

      // Transcript-grounded verdict reason: feed the model the actual competency
      // evidence, not just the numbers, so the reason is specific and defensible.
      const evidenceSummary = invite.rounds
        .filter((r: RoundShape) => r.status === 'completed')
        .flatMap((r: RoundShape) =>
          (r.competencies || []).map((c) => `${c.label || ''}: ${c.rating}/5${c.evidence ? ` — "${String(c.evidence).slice(0, 120)}"` : ''}`)
        )
        .slice(0, 12)
        .join('\n')
      const verdictLabel = VERDICT_LABELS[invite.verdict as keyof typeof VERDICT_LABELS] || 'Maybe'

      try {
        const { text: verdictReason } = await generateText({
          model: await getModel(),
          prompt: `A candidate received a "${verdictLabel}" verdict (composite ${invite.compositeScore}/100, confidence: ${invite.confidence}) for the role "${assessment?.role || 'the role'}".

Per-competency evidence across rounds:
${evidenceSummary}

In 1-2 sentences, give the hiring manager a specific, decision-grade rationale: what carried the verdict and the single biggest reservation. Reference concrete competencies. No fluff.`,
          maxOutputTokens: 120,
          temperature: 0.4,
        })
        invite.verdictReason = verdictReason.trim().slice(0, 300)
      } catch {
        invite.verdictReason = `Candidate scored ${invite.compositeScore}/100 across all rounds (${invite.confidence} confidence).`
      }
    }

    await invite.save()

    return NextResponse.json({
      invite,
      sessionId,
      overallScore: analysis.overallScore,
      breakdown: analysis.breakdown,
      competencies: analysis.competencies,
      confidence: analysis.confidence,
    })
  } catch (error) {
    console.error('Assessment round complete error:', error)
    return NextResponse.json({ error: 'Failed to complete round' }, { status: 500 })
  }
}
