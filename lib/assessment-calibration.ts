import type { Verdict } from '@/lib/assessment'

/**
 * Pillar 7 — calibration loop.
 *
 * Compares Intervue's verdict against the real hiring outcome the recruiter
 * later records. Produces the headline proof for the whole product:
 * "candidates Intervue recommended were hired/advanced X% of the time."
 */

export type OutcomeDecision = 'hired' | 'advanced' | 'rejected' | 'declined'

export interface CalibrationInput {
  verdict: string | null
  outcome?: { decision: OutcomeDecision } | null
}

const VERDICTS: Verdict[] = ['strong_hire', 'hire', 'maybe', 'no_hire']
function asVerdict(v: string | null): Verdict | null {
  return v && (VERDICTS as string[]).includes(v) ? (v as Verdict) : null
}

export interface CalibrationResult {
  sampleSize: number // outcomes that count toward accuracy (excludes "declined")
  verifiedHireRate: number | null // of recommended candidates, % hired/advanced
  recommendedCount: number
  byVerdict: Record<Verdict, { positive: number; total: number; rate: number | null }>
}

// A positive outcome = the candidate moved forward (hired or advanced to a human round).
const POSITIVE_OUTCOMES: OutcomeDecision[] = ['hired', 'advanced']
// Intervue "recommends" these verdicts.
const RECOMMENDED_VERDICTS: Verdict[] = ['strong_hire', 'hire']

const EMPTY_BUCKET = () => ({ positive: 0, total: 0, rate: null as number | null })

export function computeCalibration(invites: CalibrationInput[]): CalibrationResult {
  const byVerdict: Record<Verdict, { positive: number; total: number; rate: number | null }> = {
    strong_hire: EMPTY_BUCKET(),
    hire: EMPTY_BUCKET(),
    maybe: EMPTY_BUCKET(),
    no_hire: EMPTY_BUCKET(),
  }

  let recommendedPositive = 0
  let recommendedCount = 0
  let sampleSize = 0

  for (const inv of invites) {
    const decision = inv.outcome?.decision
    const verdict = asVerdict(inv.verdict)
    // Only count outcomes that reflect the company's judgement.
    if (!decision || decision === 'declined' || !verdict) continue
    sampleSize++

    const positive = POSITIVE_OUTCOMES.includes(decision)
    const bucket = byVerdict[verdict]
    bucket.total++
    if (positive) bucket.positive++

    if (RECOMMENDED_VERDICTS.includes(verdict)) {
      recommendedCount++
      if (positive) recommendedPositive++
    }
  }

  for (const v of Object.keys(byVerdict) as Verdict[]) {
    const b = byVerdict[v]
    b.rate = b.total > 0 ? Math.round((b.positive / b.total) * 100) : null
  }

  return {
    sampleSize,
    recommendedCount,
    verifiedHireRate: recommendedCount > 0 ? Math.round((recommendedPositive / recommendedCount) * 100) : null,
    byVerdict,
  }
}

export const OUTCOME_LABELS: Record<OutcomeDecision, string> = {
  hired: 'Hired',
  advanced: 'Advanced',
  rejected: 'Rejected',
  declined: 'Declined',
}

export const OUTCOME_COLORS: Record<OutcomeDecision, string> = {
  hired: '#2DE2C5',
  advanced: '#3FC5F0',
  rejected: '#f43f5e',
  declined: '#888FC0',
}
