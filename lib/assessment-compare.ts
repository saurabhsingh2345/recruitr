/**
 * Pillar 6 (closed loop) — comparative pool view.
 *
 * Turns a set of invites into a normalized competency matrix so a recruiter can
 * rank the whole pool side-by-side: candidates as rows, competencies as columns,
 * each cell an anchored 1-5 rating. Pure + client-safe.
 */

export interface CompareRoundCompetency {
  key: string
  label?: string
  rating?: number
  score?: number
}
export interface CompareInviteRound {
  status?: string
  competencies?: CompareRoundCompetency[]
}
export interface CompareInvite {
  token: string
  candidateName?: string
  status?: string
  compositeScore?: number
  verdict?: string | null
  confidence?: 'high' | 'medium' | 'low' | null
  integrityLevel?: 'clean' | 'minor' | 'flagged' | null
  rounds?: CompareInviteRound[]
}

export interface CompareCell {
  rating: number | null // averaged 1-5 across rounds
  score: number | null
}
export interface CompareRow {
  token: string
  name: string
  composite: number
  verdict: string | null
  confidence: 'high' | 'medium' | 'low' | null
  integrityLevel: 'clean' | 'minor' | 'flagged' | null
  percentile: number // within this pool, by composite
  cells: Record<string, CompareCell>
  /** competency key where this candidate is the weakest relative to the pool */
  relativeWeakness: string | null
}
export interface ComparisonMatrix {
  competencies: { key: string; label: string }[]
  rows: CompareRow[]
  poolAverages: Record<string, number | null> // avg rating per competency across pool
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function buildComparisonMatrix(invites: CompareInvite[]): ComparisonMatrix {
  // Only candidates who actually have scored competencies belong in a comparison.
  const scored = invites.filter(
    (i) => (i.rounds || []).some((r) => (r.competencies || []).length > 0)
  )

  // Union of competency keys (preserve first-seen label and order).
  const competencyOrder: string[] = []
  const labels: Record<string, string> = {}
  for (const inv of scored) {
    for (const r of inv.rounds || []) {
      for (const c of r.competencies || []) {
        if (!labels[c.key]) {
          labels[c.key] = c.label || c.key
          competencyOrder.push(c.key)
        }
      }
    }
  }

  // Per-candidate cells: average rating/score across rounds sharing a key.
  const rowsBase = scored.map((inv) => {
    const ratingsByKey: Record<string, number[]> = {}
    const scoresByKey: Record<string, number[]> = {}
    for (const r of inv.rounds || []) {
      for (const c of r.competencies || []) {
        if (typeof c.rating === 'number') (ratingsByKey[c.key] ||= []).push(c.rating)
        if (typeof c.score === 'number') (scoresByKey[c.key] ||= []).push(c.score)
      }
    }
    const cells: Record<string, CompareCell> = {}
    for (const key of competencyOrder) {
      cells[key] = {
        rating: avg(ratingsByKey[key] || []),
        score: avg(scoresByKey[key] || []),
      }
    }
    return {
      token: inv.token,
      name: inv.candidateName || 'Candidate',
      composite: Math.round(inv.compositeScore || 0),
      verdict: inv.verdict ?? null,
      confidence: inv.confidence ?? null,
      integrityLevel: inv.integrityLevel ?? null,
      cells,
    }
  })

  // Pool averages per competency.
  const poolAverages: Record<string, number | null> = {}
  for (const key of competencyOrder) {
    poolAverages[key] = avg(
      rowsBase.map((r) => r.cells[key].rating).filter((v): v is number => v != null)
    )
  }

  // Composite percentile within the pool.
  const composites = rowsBase.map((r) => r.composite)
  const rows: CompareRow[] = rowsBase
    .map((r) => {
      const below = composites.filter((c) => c <= r.composite).length
      const percentile = composites.length > 1 ? Math.round((below / composites.length) * 100) : 100
      // Relative weakness = competency furthest below the pool average for this candidate.
      let relativeWeakness: string | null = null
      let worstDelta = 0
      for (const key of competencyOrder) {
        const v = r.cells[key].rating
        const pa = poolAverages[key]
        if (v != null && pa != null) {
          const delta = v - pa
          if (delta < worstDelta) {
            worstDelta = delta
            relativeWeakness = key
          }
        }
      }
      return { ...r, percentile, relativeWeakness }
    })
    .sort((a, b) => b.composite - a.composite)

  return {
    competencies: competencyOrder.map((key) => ({ key, label: labels[key] })),
    rows,
    poolAverages,
  }
}

/** 1-5 rating → heatmap color (red → amber → teal). */
export function ratingColor(rating: number | null): string {
  if (rating == null) return '#1A1A1F'
  if (rating >= 4.25) return '#2DE2C5'
  if (rating >= 3.5) return '#5CC8A8'
  if (rating >= 2.75) return '#f59e0b'
  if (rating >= 2) return '#f97316'
  return '#f43f5e'
}
