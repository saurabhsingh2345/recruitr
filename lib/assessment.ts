export type Verdict = 'strong_hire' | 'hire' | 'maybe' | 'no_hire'

export function computeVerdict(compositeScore: number): Verdict {
  if (compositeScore >= 80) return 'strong_hire'
  if (compositeScore >= 65) return 'hire'
  if (compositeScore >= 50) return 'maybe'
  return 'no_hire'
}

export function computeCompositeScore(scores: number[]): number {
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export interface ScoredRound {
  score: number
  weight?: number // round weight (default 1)
  confidence?: 'high' | 'medium' | 'low'
  /** lowest competency rating (1-5) seen in this round, for bar-gating */
  minRating?: number
}

/**
 * Weighted composite across rounds. Falls back to equal weighting when no
 * weights are set, so it is backward-compatible with the flat-average behaviour.
 */
export function computeWeightedComposite(rounds: ScoredRound[]): number {
  if (rounds.length === 0) return 0
  const totalWeight = rounds.reduce((s, r) => s + (r.weight ?? 1), 0) || 1
  return Math.round(rounds.reduce((s, r) => s + r.score * (r.weight ?? 1), 0) / totalWeight)
}

/**
 * Verdict with a bar-gate: a single critical competency failure (rating of 1
 * on any round) caps the verdict, because one fundamental miss should not be
 * averaged away by strong performance elsewhere. This is the hook recruiter-
 * defined must-haves (Pillar 6) will plug into.
 */
export function computeGatedVerdict(composite: number, rounds: ScoredRound[]): Verdict {
  const base = computeVerdict(composite)
  const hasCriticalFail = rounds.some((r) => typeof r.minRating === 'number' && r.minRating <= 1)
  if (!hasCriticalFail) return base
  // Cap at "maybe": never auto-recommend a hire over a fundamental gap.
  const order: Verdict[] = ['no_hire', 'maybe', 'hire', 'strong_hire']
  const cappedIdx = Math.min(order.indexOf(base), order.indexOf('maybe'))
  return order[cappedIdx]
}

/**
 * Overall confidence in the verdict: weakest-link across rounds, downgraded
 * further when round scores swing wildly (inconsistent signal).
 */
export function computeOverallConfidence(rounds: ScoredRound[]): 'high' | 'medium' | 'low' {
  if (rounds.length === 0) return 'low'
  const rank = { low: 0, medium: 1, high: 2 } as const
  const labels = ['low', 'medium', 'high'] as const
  let min = 2
  for (const r of rounds) min = Math.min(min, rank[r.confidence ?? 'medium'])
  // High variance across rounds → drop one level.
  if (rounds.length >= 2) {
    const scores = rounds.map((r) => r.score)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
    if (Math.sqrt(variance) > 20) min = Math.max(0, min - 1)
  }
  return labels[min]
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  strong_hire: 'Strong hire',
  hire: 'Hire',
  maybe: 'Maybe',
  no_hire: 'No hire',
}

export const VERDICT_COLORS: Record<Verdict, string> = {
  strong_hire: '#2DE2C5',
  hire: '#3FC5F0',
  maybe: '#f59e0b',
  no_hire: '#f43f5e',
}
