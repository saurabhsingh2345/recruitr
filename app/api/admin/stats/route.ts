import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Team } from '@/lib/models/Team'
import { WeeklyBrief } from '@/lib/models/WeeklyBrief'
import { HireSignal } from '@/lib/models/HireSignal'
import { VerifiedCard } from '@/lib/models/VerifiedCard'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const now = new Date()
  const day = 1000 * 60 * 60 * 24
  const sevenDaysAgo = new Date(now.getTime() - 7 * day)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * day)

  const [
    totalUsers,
    newUsersLast30,
    totalSessions,
    completedSessions,
    sessionsLast7Days,
    companyModeSessions,
    totalTeams,
    totalBriefs,
    topSkillsAgg,
    dailySessionsAgg,
    verifiedCardCount,
    hireSignalUserIds,
    avgHireScoreAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    InterviewSession.countDocuments(),
    InterviewSession.countDocuments({ status: 'completed' }),
    InterviewSession.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    InterviewSession.countDocuments({ 'companyMode.company': { $exists: true, $ne: null } }),
    Team.countDocuments(),
    WeeklyBrief.countDocuments(),
    InterviewSession.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$targetSkill', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    InterviewSession.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    VerifiedCard.countDocuments(),
    HireSignal.distinct('userId'),
    HireSignal.aggregate([
      { $group: { _id: null, avg: { $avg: '$proofScoreAtHire' }, total: { $sum: 1 } } },
    ]),
  ])

  // Build 7-day array with zeros for missing days
  const dailyMap = new Map(dailySessionsAgg.map((d: { _id: string; count: number }) => [d._id, d.count]))
  const dailySessions = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * day)
    const key = date.toISOString().slice(0, 10)
    return { date: key, count: dailyMap.get(key) || 0 }
  })

  const hiredCount = hireSignalUserIds.length
  const hireRate = verifiedCardCount > 0 ? Math.round((hiredCount / verifiedCardCount) * 100) : 0
  const avgProofScoreAtHire = avgHireScoreAgg[0]?.avg ? Math.round(avgHireScoreAgg[0].avg) : null
  const totalHireSignals = avgHireScoreAgg[0]?.total ?? 0

  return NextResponse.json({
    users: { total: totalUsers, newLast30: newUsersLast30 },
    sessions: {
      total: totalSessions,
      completed: completedSessions,
      last7Days: sessionsLast7Days,
      companyMode: companyModeSessions,
      completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    },
    teams: { total: totalTeams },
    briefs: { total: totalBriefs },
    topSkills: topSkillsAgg.map((s: { _id: string; count: number }) => ({ skill: s._id, count: s.count })),
    dailySessions,
    verification: {
      verifiedCards: verifiedCardCount,
      hiredCandidates: hiredCount,
      hireRate,
      totalHireSignals,
      avgProofScoreAtHire,
    },
  })
}
