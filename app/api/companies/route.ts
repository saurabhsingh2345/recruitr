import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'

export async function GET() {
  await connectDB()

  const agg = await InterviewSession.aggregate([
    { $match: { 'companyMode.company': { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: '$companyMode.company',
        sessionCount: { $sum: 1 },
        avgScore: { $avg: '$scores.overall' },
        styles: { $addToSet: '$companyMode.style' },
      },
    },
    { $sort: { sessionCount: -1 } },
    { $limit: 50 },
  ])

  const companies = agg.map((c: { _id: string; sessionCount: number; avgScore: number; styles: string[] }) => ({
    name: c._id,
    sessionCount: c.sessionCount,
    avgScore: c.avgScore ? Math.round(c.avgScore) : null,
    style: c.styles[0] || null,
  }))

  return NextResponse.json({ companies })
}
