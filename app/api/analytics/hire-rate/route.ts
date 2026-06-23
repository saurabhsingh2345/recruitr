import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { HireSignal } from '@/lib/models/HireSignal'
import { VerifiedCard } from '@/lib/models/VerifiedCard'

// Public endpoint — no auth required. Returns aggregate platform accuracy stats.
export async function GET() {
  try {
    await connectDB()

    const [verifiedCount, hiredCount, topSkillsAgg, avgScoreAgg] = await Promise.all([
      VerifiedCard.countDocuments(),
      HireSignal.distinct('userId').then(ids => ids.length),
      HireSignal.aggregate([
        { $group: { _id: '$skill', count: { $sum: 1 }, avgScore: { $avg: '$proofScoreAtHire' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      HireSignal.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$proofScoreAtHire' }, total: { $sum: 1 } } },
      ]),
    ])

    const totalHireSignals = avgScoreAgg[0]?.total ?? 0
    const avgProofScoreAtHire = avgScoreAgg[0]?.avgScore ? Math.round(avgScoreAgg[0].avgScore) : null
    const hireRate = verifiedCount > 0 ? Math.round((hiredCount / verifiedCount) * 100) : 0

    return NextResponse.json({
      verifiedCount,
      hiredCount,
      hireRate,
      totalHireSignals,
      avgProofScoreAtHire,
      topHiredSkills: topSkillsAgg.map(s => ({
        skill: s._id,
        hires: s.count,
        avgProofScore: Math.round(s.avgScore),
      })),
    })
  } catch (err) {
    console.error('[analytics/hire-rate]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
