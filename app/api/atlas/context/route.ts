import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { Handshake } from '@/lib/models/Handshake'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [profile, sessions, activeHandshakes] = await Promise.all([
    Profile.findOne({ userId: session.user.id })
      .select('parsedSkills targetRole')
      .lean() as Promise<{
        parsedSkills: { name: string; proofScore: number }[]
        targetRole: string
      } | null>,
    InterviewSession.find({ userId: session.user.id, status: 'completed' })
      .select('targetSkill completedAt')
      .sort({ completedAt: -1 })
      .lean() as Promise<{ targetSkill: string; completedAt: Date }[]>,
    Handshake.find({ candidateId: session.user.id, status: 'surfaced_to_candidate' })
      .select('roleSpecId')
      .lean() as Promise<{ roleSpecId: unknown }[]>,
  ])

  if (!profile) {
    return NextResponse.json({
      proactiveInsight: null,
      decayingSkills: [],
      recentProgress: [],
      pendingHandshakes: 0,
    })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Map skill → last practiced date
  const lastPracticedAt = new Map<string, Date>()
  for (const s of sessions) {
    const key = s.targetSkill?.toLowerCase()
    if (key && !lastPracticedAt.has(key)) {
      lastPracticedAt.set(key, new Date(s.completedAt))
    }
  }

  // Find skills idle > 30 days, sorted by score ascending (lowest priority first)
  const decayingSkills = (profile.parsedSkills || [])
    .filter(sk => {
      const last = lastPracticedAt.get(sk.name.toLowerCase())
      return !last || last < thirtyDaysAgo
    })
    .sort((a, b) => a.proofScore - b.proofScore)
    .slice(0, 5)
    .map(sk => {
      const last = lastPracticedAt.get(sk.name.toLowerCase())
      const daysIdle = last
        ? Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000))
        : null
      return { name: sk.name, score: sk.proofScore, daysIdle }
    })

  // Try to match decaying skills against active role requirements
  let proactiveInsight: { skill: string; score: number; daysIdle: number | null; reason: string } | null = null

  // Check if active handshakes have role specs requiring a decaying skill
  if (activeHandshakes.length > 0) {
    const roleIds = activeHandshakes.map(h => h.roleSpecId)
    const roles = await RoleSpec.find({ _id: { $in: roleIds }, status: 'active' })
      .select('mustHave')
      .lean() as { mustHave: { skill: string }[] }[]

    const requiredSkills = new Set(roles.flatMap(r => (r.mustHave || []).map(s => s.skill.toLowerCase())))

    const urgentSkill = decayingSkills.find(sk => requiredSkills.has(sk.name.toLowerCase()))
    if (urgentSkill) {
      proactiveInsight = {
        skill: urgentSkill.name,
        score: urgentSkill.score,
        daysIdle: urgentSkill.daysIdle,
        reason: 'required_by_match',
      }
    }
  }

  // Fallback: lowest-score idle skill
  if (!proactiveInsight && decayingSkills.length > 0) {
    const top = decayingSkills[0]
    proactiveInsight = {
      skill: top.name,
      score: top.score,
      daysIdle: top.daysIdle,
      reason: 'lowest_score',
    }
  }

  // Recent progress: last 3 sessions with score improvement
  const recentProgress = sessions.slice(0, 5).map(s => ({
    skill: s.targetSkill,
    at: s.completedAt,
  }))

  return NextResponse.json({
    proactiveInsight,
    decayingSkills,
    recentProgress,
    pendingHandshakes: activeHandshakes.length,
  })
}
