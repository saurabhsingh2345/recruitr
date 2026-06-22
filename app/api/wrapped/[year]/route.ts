import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { year } = await params
  const y = parseInt(year, 10)
  if (isNaN(y) || y < 2020 || y > 2100) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }

  const start = new Date(`${y}-01-01T00:00:00.000Z`)
  const end = new Date(`${y + 1}-01-01T00:00:00.000Z`)

  await connectDB()

  interface LeanSession {
    format: string
    targetSkill: string
    scores?: { overall?: number }
    completedAt: Date
  }

  const [sessions, user, profile] = await Promise.all([
    InterviewSession.find({
      userId: session.user.id,
      status: 'completed',
      completedAt: { $gte: start, $lt: end },
    })
      .select('format targetSkill scores completedAt insightReport.aiVerdict')
      .lean() as Promise<LeanSession[]>,
    User.findById(session.user.id).select('name username').lean(),
    Profile.findOne({ userId: session.user.id })
      .select('parsedSkills targetRole')
      .lean(),
  ])

  if (sessions.length === 0) {
    return NextResponse.json({ empty: true, year: y })
  }

  // Aggregations
  const totalSessions = sessions.length
  const avgScore = Math.round(
    sessions.reduce((sum, s) => sum + (s.scores?.overall ?? 0), 0) / totalSessions,
  )

  const skillCounts = new Map<string, number>()
  const skillScores = new Map<string, number[]>()
  for (const s of sessions) {
    const skill = s.targetSkill
    skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1)
    if (!skillScores.has(skill)) skillScores.set(skill, [])
    if (s.scores?.overall) skillScores.get(skill)!.push(s.scores.overall)
  }

  const topSkill = [...skillCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const bestScore = sessions.reduce(
    (best, s) => (s.scores?.overall ?? 0) > best.score
      ? { skill: s.targetSkill, score: s.scores?.overall ?? 0, at: s.completedAt }
      : best,
    { skill: '', score: 0, at: null as Date | null },
  )

  const formatCounts = sessions.reduce((acc, s) => {
    acc[s.format] = (acc[s.format] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Month distribution
  const byMonth = Array(12).fill(0)
  for (const s of sessions) {
    const m = new Date(s.completedAt).getMonth()
    byMonth[m]++
  }

  // Streak (simple consecutive days)
  const days = new Set(sessions.map(s => new Date(s.completedAt).toISOString().slice(0, 10)))
  let maxStreak = 0
  let currentStreak = 0
  const allDays = [...days].sort()
  for (let i = 0; i < allDays.length; i++) {
    if (i === 0) { currentStreak = 1 }
    else {
      const prev = new Date(allDays[i - 1])
      const curr = new Date(allDays[i])
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      currentStreak = diff === 1 ? currentStreak + 1 : 1
    }
    maxStreak = Math.max(maxStreak, currentStreak)
  }

  const currentSkills = profile?.parsedSkills ?? []
  const topCurrentScore = currentSkills.length > 0
    ? Math.max(...currentSkills.map((s: { proofScore: number }) => s.proofScore))
    : 0

  return NextResponse.json({
    year: y,
    name: user?.name || 'Candidate',
    username: user?.username || '',
    totalSessions,
    avgScore,
    topSkill,
    bestScore,
    topFormat,
    maxStreak,
    byMonth,
    topCurrentScore,
    targetRole: profile?.targetRole || 'Software Engineer',
  })
}
