/**
 * Post-session insight utilities.
 * Computes progression velocity, next session recommendation,
 * and specialization impact for a completed interview session.
 */

export interface ScoreHistoryEntry {
  score: number
  at: Date | string
}

export interface ProgressionVelocity {
  label: string
  pointsGained: number
  sessionCount: number
  percentileBeat: number
}

export function computeProgressionVelocity(
  scoreHistory: ScoreHistoryEntry[]
): ProgressionVelocity | null {
  if (scoreHistory.length < 2) return null

  const sorted = [...scoreHistory].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  )

  const oldest = sorted[0].score
  const newest = sorted[sorted.length - 1].score
  const gained = newest - oldest
  const sessions = sorted.length

  // Rough heuristic: average improvement across platform is ~3 pts/session
  const avgRate = 3
  const actualRate = sessions > 1 ? gained / (sessions - 1) : 0
  const percentileBeat = Math.min(99, Math.round(Math.max(0, ((actualRate - avgRate) / avgRate) * 50 + 50)))

  let label = ''
  if (actualRate >= 6) label = `Improving ${Math.round(actualRate)} pts/session — faster than 85%+ of users`
  else if (actualRate >= 3) label = `Improving ${Math.round(actualRate)} pts/session — on pace with top performers`
  else if (actualRate > 0) label = `Improving ${Math.round(actualRate)} pts/session — keep practicing to accelerate`
  else label = 'Score stable — try a different format to break through'

  return { label, pointsGained: gained, sessionCount: sessions, percentileBeat }
}

export interface NextSessionRecommendation {
  format: string
  skill: string
  reason: string
}

const FORMAT_LABELS: Record<string, string> = {
  coding: 'Coding',
  system_design: 'System Design',
  project_deepdive: 'Project Deep-dive',
  behavioural: 'Behavioural',
  gap: 'Gap Analysis',
}

export function suggestNextSession(
  skill: string,
  lastFormat: string,
  score: number,
  topGap: string | null
): NextSessionRecommendation {
  // Rotate formats to build complementary depth
  const formatRotation: Record<string, string> = {
    coding: 'system_design',
    system_design: 'project_deepdive',
    project_deepdive: 'behavioural',
    behavioural: 'coding',
    gap: 'coding',
  }

  if (score < 60) {
    return {
      format: lastFormat,
      skill,
      reason: `Score below 60 — repeat the same format to solidify fundamentals before moving on.`,
    }
  }

  if (score < 75) {
    return {
      format: 'gap',
      skill,
      reason: topGap
        ? `Gap identified: "${topGap}". A gap-analysis session targets this directly.`
        : `Multiple gaps identified. A gap-analysis session will target your weakest areas.`,
    }
  }

  const nextFormat = formatRotation[lastFormat] || 'system_design'
  return {
    format: nextFormat,
    skill,
    reason: `Strong performance. ${FORMAT_LABELS[nextFormat]} pairs with ${FORMAT_LABELS[lastFormat]} to demonstrate full-stack depth for ${skill} roles.`,
  }
}

export function computeSpecializationImpact(
  skill: string,
  scoreBefore: number,
  scoreAfter: number,
  topGap: string | null
): string {
  const delta = scoreAfter - scoreBefore
  if (delta <= 0) {
    return `Your ${skill} profile held steady. Focus on the gaps to push the score higher.`
  }
  const gapNote = topGap ? ` Next gap to close: ${topGap}.` : ''
  return `This session raised your ${skill} proof score by +${delta} points (${scoreBefore} → ${scoreAfter}).${gapNote}`
}

export function buildGapsWithNextSteps(
  gaps: string[]
): Array<{ gap: string; nextStep: string }> {
  const gapActions: Array<[RegExp, string]> = [
    [/cost|optimization|trade.?off/i, 'Practice a System Design session focused on cost trade-offs and capacity planning.'],
    [/database|scaling|sharding/i, 'Take a Project Deep-dive session centred on database design.'],
    [/observ|monitor|logging|tracing/i, 'Study distributed systems observability — then take a Gap Analysis session.'],
    [/concurr|thread|async|goroutine/i, 'Do a Coding session specifically on concurrency patterns.'],
    [/test|coverage|reliability/i, 'Add tests to your top GitHub repo, then take a Project Deep-dive.'],
    [/communication|explain|articulate/i, 'Practice a Behavioural session to sharpen how you explain technical decisions.'],
    [/edge case|corner/i, 'Focus on edge-case walkthroughs in your next Coding session.'],
    [/memory|gc|heap/i, 'Study memory management specifics for your primary language.'],
  ]

  return gaps.slice(0, 4).map(gap => {
    const match = gapActions.find(([re]) => re.test(gap))
    return {
      gap,
      nextStep: match
        ? match[1]
        : 'Revisit this area in your next session and use the ideal answers above as a study guide.',
    }
  })
}
