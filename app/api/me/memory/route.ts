import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [sessions, sessionCount] = await Promise.all([
    InterviewSession.find(
      { userId: session.user.id, status: 'completed' },
      { 'insightReport.weaknessSignals': 1, 'insightReport.gaps': 1, targetSkill: 1 },
    )
      .sort({ completedAt: -1 })
      .limit(8)
      .lean(),
    InterviewSession.countDocuments({ userId: session.user.id, status: 'completed' }),
  ])

  const tally = new Map<string, { skill: string; topic: string; severity: number; count: number }>()

  for (const s of sessions) {
    const signals: { skill: string; topic: string; severity: 1 | 2 | 3 }[] =
      (s.insightReport?.weaknessSignals ?? []).slice()

    // Synthesise from free-text gaps when structured signals are missing
    if (signals.length === 0) {
      const gaps: string[] = s.insightReport?.gaps ?? []
      for (const gap of gaps.slice(0, 3)) {
        const topic = gap.length > 80 ? gap.slice(0, 80) + '…' : gap
        signals.push({ skill: s.targetSkill || 'General', topic, severity: 1 })
      }
    }

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

  const all = Array.from(tally.values()).sort((a, b) => b.severity - a.severity || b.count - a.count)
  // Prefer recurring/critical — fall back to any signal if none qualify
  const recurring = all.filter(e => e.count >= 2 || e.severity === 3)
  const signals = recurring.length > 0 ? recurring.slice(0, 6) : all.slice(0, 6)

  return NextResponse.json({ signals, sessionCount })
}
