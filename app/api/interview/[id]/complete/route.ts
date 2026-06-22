import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { getModel } from '@/lib/groq'
import { calculateCohortPercentile } from '@/lib/scoring'
import { generateText } from 'ai'

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

    const analysisPrompt = `Analyze this technical interview transcript and generate a structured assessment.

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
    "technical_depth": <0-100>,
    "problem_solving": <0-100>,
    "communication": <0-100>,
    "code_quality": <0-100>
  },
  "strengths": ["<specific strength observed>", "<specific strength>", "<specific strength>"],
  "gaps": ["<specific gap>", "<specific gap>"],
  "studyRecommendations": ["<actionable recommendation>", "<recommendation>", "<recommendation>"],
  "skillDelta": <0-20 integer>,
  "idealAnswers": {
    "<exact question text from transcript>": "<what an expert engineer would answer — 2-3 sentences, concrete and technical>",
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
      idealAnswers: Record<string, string>
    }

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch {
      analysis = null as unknown as typeof analysis
    }

    if (!analysis) {
      analysis = {
        overallScore: 65,
        breakdown: { technical_depth: 65, problem_solving: 60, communication: 70, code_quality: 65 },
        strengths: ['Clear communication', 'Structured thinking'],
        gaps: ['Could go deeper on edge cases'],
        studyRecommendations: ['Practice more problems in this area'],
        skillDelta: 5,
        idealAnswers: {},
      }
    }

    interviewSession.status = 'completed'
    interviewSession.completedAt = new Date()
    interviewSession.scores = {
      overall: analysis.overallScore,
      breakdown: analysis.breakdown,
      delta: { [interviewSession.targetSkill]: analysis.skillDelta || 5 },
    }
    interviewSession.insightReport = {
      strengths: analysis.strengths || [],
      gaps: analysis.gaps || [],
      idealAnswers: analysis.idealAnswers || {},
      studyRecommendations: analysis.studyRecommendations || [],
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
        // New skill from this interview — use session score directly (not formula mismatch)
        const newScore = Math.round(analysis.overallScore * 0.7 + 30 * 0.3)

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

    // Store scoreUpdate on the session so the report page can read it
    interviewSession.scoreUpdate = scoreUpdateData
    await interviewSession.save()

    return NextResponse.json({
      success: true,
      report: interviewSession.insightReport,
      scores: interviewSession.scores,
      scoreUpdate: scoreUpdateData,
    })
  } catch (error) {
    console.error('Interview complete error:', error)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}
