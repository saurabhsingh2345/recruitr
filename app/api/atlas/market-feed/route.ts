import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { MarketFeed } from '@/lib/models/MarketFeed'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const { searchParams } = new URL(req.url)
  const limit = Math.min(20, parseInt(searchParams.get('limit') || '12', 10))

  const stored = await MarketFeed.find({}).sort({ demandScore: -1 }).limit(limit).lean()
  if (stored.length > 0) {
    return NextResponse.json({ feed: stored, generatedAt: stored[0]?.generatedAt || null })
  }

  // Collection is empty (cron hasn't run yet) — generate live from real data
  const [sessionAgg, skillAgg] = await Promise.all([
    // How many times each skill has been practiced in sessions
    InterviewSession.aggregate([
      { $match: { status: 'completed', targetSkill: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: '$targetSkill' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    // Candidate supply: avg score + count per skill
    Profile.aggregate([
      { $unwind: '$parsedSkills' },
      {
        $group: {
          _id: { $toLower: '$parsedSkills.name' },
          candidateCount: { $sum: 1 },
          avgProofScore: { $avg: '$parsedSkills.proofScore' },
        },
      },
    ]),
  ])

  const skillMap = new Map(skillAgg.map((s: { _id: string; candidateCount: number; avgProofScore: number }) => [s._id, s]))
  const maxCount = Math.max(...sessionAgg.map((s: { count: number }) => s.count), 1)

  const feed = sessionAgg.map((s: { _id: string; count: number }) => {
    const supply = skillMap.get(s._id)
    const demandScore = Math.round((s.count / maxCount) * 100)
    return {
      skill: s._id,
      demandScore,
      demandDelta: 0,
      activeRoles: 0,
      avgProofScore: Math.round(supply?.avgProofScore ?? 0),
      candidateCount: supply?.candidateCount ?? 0,
    }
  }).filter((f: { skill: string }) => f.skill)

  return NextResponse.json({ feed, generatedAt: new Date(), live: true })
}
