/**
 * Pillar 4 — integrity scoring for unproctored remote assessments.
 *
 * Signals are captured client-side during the round (tab switches, time spent
 * away from the tab, and large paste events) and turned into a 0-100 integrity
 * score (100 = clean) plus human-readable flags a recruiter can act on.
 */

export interface IntegritySignals {
  tabSwitches: number // times the candidate left the assessment tab
  focusLossSeconds: number // total seconds the tab was hidden/blurred
  pasteCount: number // number of large paste events
  pastedChars: number // total characters pasted in large pastes
  durationSeconds: number // wall-clock length of the round
}

export type IntegrityLevel = 'clean' | 'minor' | 'flagged'

export interface IntegrityResult {
  score: number // 0-100, 100 = clean
  level: IntegrityLevel
  flags: string[]
  signals: IntegritySignals
}

export const EMPTY_INTEGRITY_SIGNALS: IntegritySignals = {
  tabSwitches: 0,
  focusLossSeconds: 0,
  pasteCount: 0,
  pastedChars: 0,
  durationSeconds: 0,
}

export function computeIntegrity(raw: Partial<IntegritySignals> | undefined | null): IntegrityResult {
  const s: IntegritySignals = { ...EMPTY_INTEGRITY_SIGNALS, ...(raw || {}) }
  let score = 100
  const flags: string[] = []

  // Leaving the tab — the single strongest signal of looking something up.
  if (s.tabSwitches > 0) {
    score -= Math.min(40, s.tabSwitches * 8)
    if (s.tabSwitches >= 2) flags.push(`Left the assessment tab ${s.tabSwitches} times`)
    else flags.push('Left the assessment tab once')
  }

  // Sustained time away compounds the concern.
  if (s.focusLossSeconds >= 10) {
    score -= Math.min(20, Math.floor(s.focusLossSeconds / 5))
    if (s.focusLossSeconds >= 30) {
      flags.push(`Spent ${Math.round(s.focusLossSeconds)}s away from the tab`)
    }
  }

  // Large pastes — pasted solutions rather than typed. Small pastes are ignored.
  if (s.pasteCount > 0 && s.pastedChars >= 40) {
    score -= Math.min(45, s.pasteCount * 15)
    flags.push(`Pasted ${s.pastedChars} characters across ${s.pasteCount} paste${s.pasteCount !== 1 ? 's' : ''}`)
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const level: IntegrityLevel = score >= 85 ? 'clean' : score >= 60 ? 'minor' : 'flagged'

  return { score, level, flags, signals: s }
}

export const INTEGRITY_LABELS: Record<IntegrityLevel, string> = {
  clean: 'Clean',
  minor: 'Minor flags',
  flagged: 'Flagged',
}

export const INTEGRITY_COLORS: Record<IntegrityLevel, string> = {
  clean: '#2DE2C5',
  minor: '#f59e0b',
  flagged: '#f43f5e',
}

/** Invite-level integrity = weakest round (one bad round taints the result). */
export function aggregateIntegrity(rounds: { integrity?: { score: number } }[]): {
  score: number
  level: IntegrityLevel
} | null {
  const scored = rounds.map((r) => r.integrity?.score).filter((x): x is number => typeof x === 'number')
  if (scored.length === 0) return null
  const score = Math.min(...scored)
  const level: IntegrityLevel = score >= 85 ? 'clean' : score >= 60 ? 'minor' : 'flagged'
  return { score, level }
}
