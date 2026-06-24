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
