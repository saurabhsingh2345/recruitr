/**
 * Connection sync job — parses every connected public source and merges the
 * signals into the verified profile. The candidate's "every link adds up" engine.
 *
 * Called either inline (no queue) or by the BullMQ worker.
 */

import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { parseSource, type SourceSignal } from '@/lib/sources'
import { sendScoreChangeEmail } from '@/lib/email'

export interface SyncResult {
  results: { source: string; ok: boolean; summary: string; added: number; error?: string }[]
  signalsFound: number
  skillsUpdated: number
  message: string
}

export async function runConnectionSync(userId: string): Promise<SyncResult> {
  await connectDB()
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')

  const profile = await Profile.findOne({ userId })
  if (!profile) throw new Error('Profile not found')

  // Capture scores before merge for change detection
  const scoreBefore = new Map<string, number>(
    (profile.parsedSkills as { name: string; proofScore: number }[]).map((s) => [s.name, s.proofScore])
  )

  const results: SyncResult['results'] = []
  const allSignals: SourceSignal[] = []

  for (const conn of user.connections as {
    source: string; handle: string; status: string; summary: string; lastSyncedAt: Date | null
  }[]) {
    if (conn.source === 'github') continue // handled by profile/generate
    const res = await parseSource(conn.source, conn.handle)
    conn.status = res.ok ? 'connected' : 'error'
    conn.summary = res.summary
    conn.lastSyncedAt = new Date()
    allSignals.push(...res.signals)
    results.push({ source: conn.source, ok: res.ok, summary: res.summary, added: res.signals.length, error: res.error })
  }

  // ── Merge signals into the verified skill set (additive, corroborating) ──
  let merged = 0
  for (const sig of allSignals) {
    const idx = profile.parsedSkills.findIndex(
      (s: { name: string }) => s.name.toLowerCase() === sig.name.toLowerCase()
    )
    if (idx >= 0) {
      const skill = profile.parsedSkills[idx]
      if (!skill.evidence.includes(sig.evidenceLine)) {
        skill.evidence = [...skill.evidence, sig.evidenceLine].slice(0, 6)
        skill.proofScore = Math.min(100, Math.round(skill.proofScore * 0.85 + sig.weight * 0.15) + 2)
        skill.lastUpdated = new Date()
        merged++
      }
    } else {
      profile.parsedSkills.push({
        name: sig.name,
        evidence: [sig.evidenceLine],
        proofScore: Math.round(sig.weight),
        lastUpdated: new Date(),
      })
      merged++
    }
  }

  profile.updatedAt = new Date()
  await profile.save()
  await user.save()

  // ── Score-change email for Pro users ──
  const isPro = user.subscriptionTier === 'pro' && user.subscriptionStatus === 'active'
  if (isPro && user.email && allSignals.length > 0) {
    const changes: { skill: string; before: number; after: number; delta: number }[] = []
    for (const skill of profile.parsedSkills as { name: string; proofScore: number }[]) {
      const before = scoreBefore.get(skill.name)
      if (before !== undefined && before !== skill.proofScore) {
        changes.push({ skill: skill.name, before, after: skill.proofScore, delta: skill.proofScore - before })
      }
    }
    if (changes.length > 0) {
      sendScoreChangeEmail(user.email, user.name || 'Engineer', changes).catch(() => {})
    }
  }

  const errors = results.filter((r) => !r.ok && r.error).map((r) => `${r.source}: ${r.error}`)

  return {
    results,
    signalsFound: allSignals.length,
    skillsUpdated: merged,
    message: allSignals.length
      ? `Parsed ${results.length} source(s) — ${merged} skill signals merged into your verified profile.`
      : errors.length
      ? errors.join(' · ')
      : 'No new signals found. Check your handles are correct and public.',
  }
}
