import { Profile } from '@/lib/models/Profile'
import { calculateCohortPercentile } from '@/lib/scoring'

/** Recalculate cohortPercentile for every public profile. Run via cron, not per-session. */
export async function recalculateAllCohortPercentiles(): Promise<{ updated: number; total: number }> {
  const allProfiles = await Profile.find({ isPublic: { $ne: false } })
    .select('_id parsedSkills cohortPercentile')
    .lean()

  const overallScores = allProfiles.map((p) => {
    const sk = (p.parsedSkills as { proofScore: number }[]) || []
    return sk.length ? sk.reduce((s, x) => s + x.proofScore, 0) / sk.length : 0
  })

  let updated = 0
  for (let i = 0; i < allProfiles.length; i++) {
    const p = allProfiles[i]
    const sk = (p.parsedSkills as { proofScore: number }[]) || []
    const myScore = sk.length ? sk.reduce((s, x) => s + x.proofScore, 0) / sk.length : 0
    const next = calculateCohortPercentile(myScore, overallScores)
    if ((p.cohortPercentile ?? 0) !== next) {
      await Profile.updateOne({ _id: p._id }, { $set: { cohortPercentile: next } })
      updated++
    }
  }

  return { updated, total: allProfiles.length }
}

/** Mark a single profile dirty — percentile refresh happens on next cron run. */
export async function markPercentileStale(userId: string) {
  // Lightweight flag: touch updatedAt so index sync picks it up; cron recalculates all.
  await Profile.updateOne({ userId }, { $set: { updatedAt: new Date() } }).catch(() => {})
}
