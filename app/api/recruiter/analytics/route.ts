import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { Handshake } from '@/lib/models/Handshake'
import { Application } from '@/lib/models/Application'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const recruiterId = session.user.id

  // Last 12 weeks window
  const now = new Date()
  const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 3600 * 1000)

  // Roles for this recruiter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles = await RoleSpec.find({ recruiterId }).select('_id title status mustHave createdAt').lean<any[]>()
  const roleIds = roles.map((r) => r._id)

  // Handshakes over time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handshakes = await Handshake.find({
    roleId: { $in: roleIds },
    createdAt: { $gte: twelveWeeksAgo },
  }).lean<any[]>()

  // Applications
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applications = await Application.find({
    roleId: { $in: roleIds },
    createdAt: { $gte: twelveWeeksAgo },
  }).lean<any[]>()

  // Build weekly funnel buckets
  const weeklyData = buildWeeklyBuckets(twelveWeeksAgo, now, handshakes, applications)

  // Funnel totals
  const surfaced = handshakes.filter((h) => h.status === 'surfaced_to_candidate').length
  const applied = applications.length
  const interviewed = applications.filter((a) => a.interview?.scheduledAt).length
  const offered = applications.filter((a) => a.outcome === 'hired').length

  // Avg time to offer (days)
  const offeredApps = applications.filter(
    (a) => a.outcome === 'hired' && a.createdAt && a.updatedAt
  )
  const avgDaysToOffer =
    offeredApps.length > 0
      ? Math.round(
          offeredApps.reduce((sum, a) => {
            return sum + (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()) / 86400000
          }, 0) / offeredApps.length
        )
      : null

  // Skill gap analysis — which skills are most commonly below the bar
  const skillGaps = computeSkillGaps(handshakes)

  // Source heatmap (day of week x hour of day for handshake activity)
  const heatmap = buildHeatmap(handshakes)

  return NextResponse.json({
    funnel: { surfaced, applied, interviewed, offered },
    avgDaysToOffer,
    weeklyData,
    skillGaps: skillGaps.slice(0, 10),
    heatmap,
    activeRoles: roles.filter((r) => r.status === 'active').length,
    totalRoles: roles.length,
  })
}

function buildWeeklyBuckets(
  start: Date,
  end: Date,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handshakes: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applications: any[]
) {
  const weeks: Array<{ week: string; surfaced: number; applied: number }> = []
  const cursor = new Date(start)

  while (cursor < end) {
    const weekEnd = new Date(cursor.getTime() + 7 * 24 * 3600 * 1000)
    const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    weeks.push({
      week: label,
      surfaced: handshakes.filter((h) => {
        const d = new Date(h.createdAt)
        return d >= cursor && d < weekEnd && h.status === 'surfaced_to_candidate'
      }).length,
      applied: applications.filter((a) => {
        const d = new Date(a.createdAt)
        return d >= cursor && d < weekEnd
      }).length,
    })

    cursor.setTime(weekEnd.getTime())
  }
  return weeks
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeSkillGaps(handshakes: any[]) {
  const gapMap = new Map<string, number>()

  for (const hs of handshakes) {
    for (const match of hs.verdict?.skillMatches || []) {
      if (!match.cleared) {
        gapMap.set(match.skill, (gapMap.get(match.skill) || 0) + 1)
      }
    }
  }

  return Array.from(gapMap.entries())
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHeatmap(handshakes: any[]) {
  // 7 days x 24 hours grid, value = count
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const hs of handshakes) {
    const d = new Date(hs.createdAt)
    const day = d.getUTCDay()
    const hour = d.getUTCHours()
    grid[day][hour]++
  }
  return grid
}
