/**
 * Cron: weekly specialization inference.
 * Run Sunday 08:00 UTC.
 * For users with 5+ completed sessions, infers specializations and writes to profile.
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { inferSpecializations } from '@/lib/specialization-inference'
import { createNotification } from '@/lib/notifications'

export const maxDuration = 120

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Find users with 5+ completed sessions
  const pipeline = [
    { $match: { status: 'completed' } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $match: { count: { $gte: 5 } } },
  ]

  const eligible = await InterviewSession.aggregate(pipeline)
  let updated = 0
  let skipped = 0

  for (const { _id: userId } of eligible) {
    try {
      const sessions = await InterviewSession.find({
        userId,
        status: 'completed',
      })
        .select('targetSkill format scores insightReport completedAt projects githubContext')
        .sort({ completedAt: -1 })
        .limit(30)
        .lean()

      const summaries = sessions.map((s) => {
        const anyS = s as {
          _id: { toString(): string }
          targetSkill: string
          format: string
          scores: { overall: number }
          insightReport: { strengths: string[]; gaps: string[]; aiVerdict: string }
          completedAt: Date
          githubContext: string
        }
        const repoUrls = (anyS.githubContext || '')
          .match(/https?:\/\/github\.com\/[^\s"]+/g) || []
        return {
          id: anyS._id.toString(),
          skill: anyS.targetSkill,
          format: anyS.format,
          score: anyS.scores?.overall || 0,
          completedAt: anyS.completedAt,
          strengths: anyS.insightReport?.strengths || [],
          gaps: anyS.insightReport?.gaps || [],
          aiVerdict: anyS.insightReport?.aiVerdict || '',
          repoLinks: repoUrls.slice(0, 3),
        }
      })

      const inferred = await inferSpecializations(summaries)
      if (inferred.length === 0) { skipped++; continue }

      const profile = await Profile.findOne({ userId })
      if (!profile) { skipped++; continue }

      // Merge with existing confirmed-by-user specializations
      const confirmed = (profile.specializations || []).filter(
        (sp: { confirmedByUser: boolean }) => sp.confirmedByUser
      )
      const confirmedNames = new Set(
        confirmed.map((sp: { name: string; skill: string }) => `${sp.skill}::${sp.name.toLowerCase()}`)
      )

      const fresh = inferred
        .filter(inf => !confirmedNames.has(`${inf.skill}::${inf.name.toLowerCase()}`))
        .map(inf => ({
          name: inf.name,
          skill: inf.skill,
          score: inf.score,
          scoreHistory: inf.scoreHistory,
          inferredAt: new Date(),
          confirmedByUser: false,
          evidence: inf.evidence,
        }))

      profile.specializations = [...confirmed, ...fresh]
      await profile.save()

      if (fresh.length > 0) {
        const topNew = fresh[0]
        createNotification(
          userId.toString(),
          'score_milestone',
          `New specialization identified: ${topNew.name}`,
          `Based on your ${topNew.skill} sessions, we identified you as a ${topNew.name} specialist (score: ${topNew.score}).`,
          '/settings#specializations'
        ).catch(() => {})
      }

      updated++
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ updated, skipped, total: eligible.length })
}
