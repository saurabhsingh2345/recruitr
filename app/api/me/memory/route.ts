import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const sessions = await InterviewSession.find(
    { userId: session.user.id, status: 'completed' },
    { 'insightReport.weaknessSignals': 1 },
  )
    .sort({ completedAt: -1 })
    .limit(5)
    .lean()

  const sessionCount = await InterviewSession.countDocuments({
    userId: session.user.id,
    status: 'completed',
  })

  const tally = new Map<string, { skill: string; topic: string; severity: number; count: number }>()

  for (const s of sessions) {
    const signals = s.insightReport?.weaknessSignals ?? []
    for (const sig of signals) {
      const key = `${sig.skill}::${sig.topic}`
      const existing = tally.get(key)
      if (existing) {
        existing.count += 1
        existing.severity = Math.max(existing.severity, sig.severity)
      } else {
        tally.set(key, { skill: sig.skill, topic: sig.topic, severity: sig.severity, count: 1 })
      }
    }
  }

  const recurring = Array.from(tally.values())
    .filter(e => e.count >= 2 || e.severity === 3)
    .sort((a, b) => b.severity - a.severity || b.count - a.count)
    .slice(0, 6)

  return NextResponse.json({ signals: recurring, sessionCount })
}
