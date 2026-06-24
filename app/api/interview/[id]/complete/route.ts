import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { calculateCohortPercentile } from '@/lib/scoring'
import { generateText } from 'ai'
import { processReferralMilestone } from '@/lib/referrals'
import { checkAndIssueCertificates } from '@/lib/certificates'
import { createNotification } from '@/lib/notifications'
import { extractWeaknessSignals } from '@/lib/memory'
import {
  computeProgressionVelocity,
  suggestNextSession,
  computeSpecializationImpact,
  buildGapsWithNextSteps,
} from '@/lib/interview-insights'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    await connectDB()

    const interviewSession = await InterviewSession.findOne({
      _id: id,
      userId: session.user.id,
    })

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const transcript = interviewSession.messages
      .map((m: { role: string; content: string }) =>
        `${m.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
      .join('\n\n')

    // Extract unique questions from the transcript (AI turns that end with '?')
    const questions = interviewSession.messages
      .filter((m: { role: string; content: string }) => m.role === 'ai' && m.content.includes('?'))
      .slice(0, 5)
      .map((m: { content: string }) => {
        const sentences = m.content.split(/[.!]/).filter(s => s.includes('?'))
        return sentences[0]?.trim() || m.content.slice(0, 120)
      })

    const FORMAT_RUBRICS: Record<string, { axes: Record<string, string>; expertLabel: string }> = {
      coding:        { axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', code_quality: 'code_quality' }, expertLabel: 'expert engineer' },
      system_design: { axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', design_quality: 'design_quality' }, expertLabel: 'staff engineer' },
      project_deepdive: { axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', code_quality: 'ownership_signal' }, expertLabel: 'senior engineer' },
      behavioural:   { axes: { technical_depth: 'situation_clarity', problem_solving: 'action_quality', communication: 'communication', code_quality: 'impact_articulation' }, expertLabel: 'senior engineer' },
      gap:           { axes: { technical_depth: 'technical_depth', problem_solving: 'problem_solving', communication: 'communication', code_quality: 'concept_clarity' }, expertLabel: 'expert engineer' },
      pm_case:       { axes: { technical_depth: 'problem_framing', problem_solving: 'prioritization_logic', communication: 'communication', code_quality: 'insight_quality' }, expertLabel: 'senior PM' },
      design_critique: { axes: { technical_depth: 'ux_reasoning', problem_solving: 'systems_thinking', communication: 'communication', code_quality: 'design_rationale' }, expertLabel: 'senior designer' },
      ops_case:      { axes: { technical_depth: 'process_design', problem_solving: 'resource_allocation', communication: 'communication', code_quality: 'risk_identification' }, expertLabel: 'senior ops lead' },
      sales_discovery: { axes: { technical_depth: 'discovery_quality', problem_solving: 'objection_handling', communication: 'communication', code_quality: 'value_articulation' }, expertLabel: 'senior AE' },
    }
    const rubric = FORMAT_RUBRICS[interviewSession.format] || FORMAT_RUBRICS.coding
    const breakdownKeys = Object.entries(rubric.axes).map(([, v]) => `"${v}": <0-100>`).join(',\n    ')

    const analysisPrompt = `Analyze this interview transcript and generate a structured assessment.

Interview format: ${interviewSession.format}
Target skill: ${interviewSession.targetSkill}

TRANSCRIPT:
${transcript.slice(0, 3000)}

QUESTIONS ASKED (extract these for idealAnswers):
${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Return ONLY valid JSON (no markdown, no code fences):
{
  "overallScore": <0-100 integer>,
  "breakdown": {
    ${breakdownKeys}
  },
  "strengths": ["<specific strength observed>", "<specific strength>", "<specific strength>"],
  "gaps": ["<specific gap>", "<specific gap>"],
  "studyRecommendations": ["<actionable recommendation>", "<recommendation>", "<recommendation>"],
  "skillDelta": <0-20 integer>,
  "idealAnswers": {
    "<exact question text from transcript>": "<what a ${rubric.expertLabel} would answer — 2-3 sentences, concrete and specific>",
    "<another question>": "<expert answer>"
  }
}`

    const { text } = await generateText({
      model: await getModel(),
      prompt: analysisPrompt,
      maxOutputTokens: 1500,
    })

    let analysis: {
      overallScore: number
      breakdown: Record<string, number>
      strengths: string[]
      gaps: string[]
      studyRecommendations: string[]
      skillDelta: number
      idealAnswers: Record<string, string> | { question: string; answer: string }[]
      aiVerdict?: string
    }

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      analysis = null as unknown as typeof analysis
    }

    if (!analysis) {
      const fallbackBreakdown = Object.fromEntries(
        Object.values(rubric.axes).map(key => [key, 65])
      )
      analysis = {
        overallScore: 65,
        breakdown: fallbackBreakdown,
        strengths: ['Clear communication', 'Structured thinking'],
        gaps: ['Could go deeper on edge cases'],
        studyRecommendations: ['Practice more problems in this area'],
        skillDelta: 5,
        idealAnswers: [],
        aiVerdict: 'Solid foundational understanding demonstrated.',
      }
    }

    // Normalise idealAnswers: schema expects Array<{question, answer}>
    const normalizedIdealAnswers = (() => {
      const raw = analysis.idealAnswers
      if (!raw) return []
      if (Array.isArray(raw)) {
        return (raw as { question?: string; answer?: string }[])
          .filter(item => item?.question)
          .map(item => ({ question: item.question!, answer: String(item.answer ?? '') }))
      }
      return Object.entries(raw as Record<string, string>).map(([question, answer]) => ({
        question,
        answer: String(answer),
      }))
    })()

    // Generate a short punchy aiVerdict if not already in analysis
    let aiVerdict = analysis.aiVerdict || ''
    if (!aiVerdict) {
      try {
        const { text: verdictText } = await generateText({
          model: await getModel(),
          prompt: `Write a single punchy sentence (under 80 characters) summarising the candidate's demonstrated capability in this ${interviewSession.format} interview on ${interviewSession.targetSkill}. Score: ${analysis.overallScore}/100. Top strength: ${(analysis.strengths || [])[0] || 'solid fundamentals'}. Be specific and technical. No quotes, no punctuation at end.`,
          maxOutputTokens: 60,
        })
        aiVerdict = verdictText.trim().replace(/['"]/g, '').slice(0, 100)
      } catch {
        aiVerdict = `${analysis.overallScore >= 70 ? 'Strong' : 'Developing'} ${interviewSession.targetSkill} fundamentals demonstrated.`
      }
    }

    interviewSession.status = 'completed'
    interviewSession.completedAt = new Date()
    interviewSession.scores = {
      overall: analysis.overallScore,
      breakdown: analysis.breakdown,
      delta: { [interviewSession.targetSkill]: analysis.skillDelta || 5 },
    }

    const gaps = analysis.gaps || []
    const topGap = gaps[0] || null
    interviewSession.insightReport = {
      strengths: analysis.strengths || [],
      gaps,
      gapsWithNextSteps: buildGapsWithNextSteps(gaps),
      idealAnswers: normalizedIdealAnswers,
      studyRecommendations: analysis.studyRecommendations || [],
      aiVerdict,
      weaknessSignals: [],
      nextSessionRec: suggestNextSession(
        interviewSession.targetSkill,
        interviewSession.format,
        analysis.overallScore,
        topGap
      ),
      progressionSignal: '',
      specializationImpact: '',
      generatedAt: new Date(),
    }

    // Update streak
    const userDoc = await User.findById(session.user.id)
    if (userDoc) {
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86_400_000).toDateString()
      const last = userDoc.lastSessionDate?.toDateString()
      if (last === today) {
        // already counted — no change
      } else if (last === yesterday) {
        userDoc.currentStreak += 1
      } else if (
        new Date(Date.now() - 172_800_000).toDateString() === last &&
        userDoc.freezeTokens > 0
      ) {
        userDoc.freezeTokens -= 1
        userDoc.currentStreak += 1
      } else {
        userDoc.currentStreak = 1
      }
      userDoc.longestStreak = Math.max(userDoc.longestStreak, userDoc.currentStreak)
      userDoc.lastSessionDate = new Date()
      await userDoc.save()
    }

    // Update profile skill score
    const profile = await Profile.findOne({ userId: session.user.id })
    let scoreUpdateData = {
      skill: interviewSession.targetSkill,
      before: 0,
      after: 0,
      delta: 0,
      isFirstScore: false,
    }

    if (profile) {
      const skillIndex = profile.parsedSkills.findIndex(
        (s: { name: string }) =>
          s.name.toLowerCase() === interviewSession.targetSkill.toLowerCase()
      )

      if (skillIndex >= 0) {
        const scoreBefore = profile.parsedSkills[skillIndex].proofScore
        // Weighted blend: existing score 70% + session score 30%
        const scoreAfter = Math.min(
          100,
          Math.round(scoreBefore * 0.7 + analysis.overallScore * 0.3)
        )

        profile.parsedSkills[skillIndex].proofScore = scoreAfter
        profile.parsedSkills[skillIndex].lastUpdated = new Date()
        // Append to history
        if (!profile.parsedSkills[skillIndex].scoreHistory) {
          profile.parsedSkills[skillIndex].scoreHistory = []
        }
        profile.parsedSkills[skillIndex].scoreHistory.push({
          score: scoreAfter,
          source: 'interview',
          at: new Date(),
        })

        scoreUpdateData = {
          skill: interviewSession.targetSkill,
          before: scoreBefore,
          after: scoreAfter,
          delta: scoreAfter - scoreBefore,
          isFirstScore: false,
        }
      } else {
        // New skill from this interview — use session score directly, clamped 20–100
        const newScore = Math.min(100, Math.max(20, Math.round(analysis.overallScore)))

        profile.parsedSkills.push({
          name: interviewSession.targetSkill,
          evidence: [`Completed ${interviewSession.format} interview session`],
          proofScore: newScore,
          lastUpdated: new Date(),
          scoreHistory: [{ score: newScore, source: 'interview', at: new Date() }],
        })

        scoreUpdateData = {
          skill: interviewSession.targetSkill,
          before: 0,
          after: newScore,
          delta: newScore,
          isFirstScore: true,
        }
      }

      // Recalculate cohortPercentile against all public profiles
      try {
        const allProfiles = await Profile.find({ isPublic: true })
          .select('parsedSkills')
          .lean()
        const allScores = allProfiles.map((p) => {
          const sk = (p.parsedSkills as { proofScore: number }[]) || []
          return sk.length
            ? sk.reduce((s, x) => s + x.proofScore, 0) / sk.length
            : 0
        })
        const mySkills = profile.parsedSkills as { proofScore: number }[]
        const myScore = mySkills.length
          ? mySkills.reduce((s, x) => s + x.proofScore, 0) / mySkills.length
          : 0
        profile.cohortPercentile = calculateCohortPercentile(myScore, allScores)
      } catch {
        // Non-fatal — percentile will recalculate on next generation
      }

      await profile.save()
    }

    // Enrich insight report with progression signal + specialization impact
    if (profile) {
      const skillEntry = profile.parsedSkills.find(
        (s: { name: string }) => s.name.toLowerCase() === interviewSession.targetSkill.toLowerCase()
      )
      const velocity = skillEntry?.scoreHistory
        ? computeProgressionVelocity(skillEntry.scoreHistory)
        : null
      if (velocity) {
        interviewSession.insightReport.progressionSignal = velocity.label
      }
      interviewSession.insightReport.specializationImpact = computeSpecializationImpact(
        interviewSession.targetSkill,
        scoreUpdateData.before,
        scoreUpdateData.after,
        topGap
      )
    }

    // Check if a share-worthy milestone was crossed (first time reaching 60/70/80/90)
    const MILESTONES = [90, 80, 70, 60]
    const crossedMilestone = MILESTONES.find(
      m => scoreUpdateData.before < m && scoreUpdateData.after >= m
    )
    if (crossedMilestone) {
      try {
        const proofUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/proof/${session.user.id}/${encodeURIComponent(interviewSession.targetSkill)}`
        const { text: draftText } = await generateText({
          model: await getModel(),
          prompt: `Write a short LinkedIn post (3-4 sentences, first person, conversational tone, no hashtag spam, no emojis) celebrating that I just scored ${scoreUpdateData.after}/100 on a ${interviewSession.format.replace('_', ' ')} interview for ${interviewSession.targetSkill} — hitting the ${crossedMilestone}-point milestone — on Intervue. Mention the specific skill and score naturally. End with this proof link: ${proofUrl}. Sound genuine and specific, not generic or braggy. Output only the post text.`,
          maxOutputTokens: 200,
        })
        interviewSession.insightReport.linkedInDraft = draftText.trim()
      } catch {
        // Non-fatal — draft generation failure should not block the response
      }
    }

    // Store scoreUpdate on the session so the report page can read it
    interviewSession.scoreUpdate = scoreUpdateData
    await interviewSession.save()

    // Fire-and-forget: referral milestone + certificate checks + notification + memory
    const userId = session.user.id
    extractWeaknessSignals(id, analysis.gaps || []).catch(() => {})
    processReferralMilestone(userId).catch(() => {})
    createNotification(
      userId,
      'interview_complete',
      `${interviewSession.targetSkill} interview done`,
      aiVerdict || `Score: ${scoreUpdateData.after}/100${scoreUpdateData.delta > 0 ? ` (+${scoreUpdateData.delta})` : ''}`,
      `/interview/report/${id}`
    ).catch(() => {})
    if (profile && scoreUpdateData.delta !== 0) {
      checkAndIssueCertificates(
        userId,
        scoreUpdateData.skill,
        scoreUpdateData.before,
        scoreUpdateData.after,
        profile.parsedSkills.find(
          (s: { name: string }) => s.name.toLowerCase() === scoreUpdateData.skill.toLowerCase()
        )?.evidence || []
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      report: interviewSession.insightReport,
      scores: interviewSession.scores,
      scoreUpdate: scoreUpdateData,
      cohortPercentile: profile?.cohortPercentile ?? 0,
      aiVerdict,
      linkedInDraft: interviewSession.insightReport.linkedInDraft || null,
    })
  } catch (error) {
    console.error('Interview complete error:', error)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}
