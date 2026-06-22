export function calculateProofScore(skill: {
  evidenceCount: number
  repoComplexity: number
  recencyMonths: number
}): number {
  const recencyScore = Math.max(0, 100 - skill.recencyMonths * 3)
  const raw =
    skill.evidenceCount * 15 * 0.4 +
    skill.repoComplexity * 0.3 +
    recencyScore * 0.3
  return Math.min(100, Math.max(0, Math.round(raw)))
}

export function calculateCohortPercentile(
  userScore: number,
  allScores: number[]
): number {
  if (allScores.length === 0) return 50
  const below = allScores.filter((s) => s < userScore).length
  return Math.round((below / allScores.length) * 100)
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return 'Expert'
  if (score >= 70) return 'Proficient'
  if (score >= 50) return 'Intermediate'
  if (score >= 30) return 'Developing'
  return 'Beginner'
}

/**
 * Returns a ±N confidence band based on standard deviation of recent scores.
 * A narrow band means consistent performance; a wide band means high variance.
 */
export function getConfidenceBand(scoreHistory: { score: number }[]): { low: number; high: number; sigma: number } {
  if (scoreHistory.length < 2) return { low: 0, high: 0, sigma: 0 }
  const scores = scoreHistory.map(h => h.score)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
  const sigma = Math.round(Math.sqrt(variance))
  const latest = scores[scores.length - 1]
  return {
    low: Math.max(0, latest - sigma),
    high: Math.min(100, latest + sigma),
    sigma,
  }
}

export function getScoreColor(score: number): string {
  // Cosmic spectrum — teal (high) → cyan → violet → orchid → rose (low)
  if (score >= 85) return '#2DE2C5'
  if (score >= 70) return '#3FC5F0'
  if (score >= 50) return '#8B7CF8'
  if (score >= 30) return '#C77DFF'
  return '#FB7185'
}
