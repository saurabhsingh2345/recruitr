import { DEFAULT_THRESHOLDS, type VerdictThresholds } from '@/lib/assessment'
import type { OutcomeDecision } from '@/lib/assessment-calibration'

/**
 * Pillar 7 (closed loop) — calibration → threshold auto-tuning.
 *
 * The calibration layer surfaces "candidates we recommended were hired X% of
 * the time". This module feeds that signal *back* into the scoring bar: it
 * learns the composite cut-point that best separates the outcomes this
 * recruiter actually records (hired/advanced vs rejected) and nudges the
 * default thresholds toward it.
 *
 * Deliberately conservative:
 *  - requires a minimum sample before changing anything,
 *  - blends the learned cut with the default (never a hard override),
 *  - clamps the drift so a noisy month cannot swing the bar wildly,
 *  - keeps the strong_hire/hire/maybe spacing intact.
 */

export interface CalibrationSample {
  compositeScore: number
  outcome?: { decision: OutcomeDecision } | null
}

export interface CalibratedThresholds {
  thresholds: VerdictThresholds
  applied: boolean
  sampleSize: number
  /** how far the hire bar moved from the default (positive = stricter) */
  hireShift: number
  reason: string
}

const MIN_SAMPLE = 8 // below this we don't trust the signal
const MAX_DRIFT = 12 // hire bar may move at most ±12 points from default
const BLEND = 0.5 // weight on the learned cut vs the default

const POSITIVE: OutcomeDecision[] = ['hired', 'advanced']
// "declined" = candidate withdrew; not a judgement on quality → excluded.
const COUNTS: OutcomeDecision[] = ['hired', 'advanced', 'rejected']

/**
 * Find the composite cut-point that best separates positive from negative
 * outcomes, scored by Youden's J (sensitivity + specificity − 1). Falls back
 * to the default hire bar when one class is empty.
 */
function learnHireCut(samples: { score: number; positive: boolean }[], fallback: number): number {
  const positives = samples.filter((s) => s.positive)
  const negatives = samples.filter((s) => !s.positive)
  if (positives.length === 0 || negatives.length === 0) return fallback

  // Candidate cut-points: midpoints between sorted unique scores.
  const scores = [...new Set(samples.map((s) => s.score))].sort((a, b) => a - b)
  const cuts: number[] = []
  for (let i = 0; i < scores.length - 1; i++) cuts.push((scores[i] + scores[i + 1]) / 2)
  if (cuts.length === 0) return fallback

  let bestCut = fallback
  let bestJ = -Infinity
  for (const cut of cuts) {
    // recommend (predict positive) when score >= cut
    const tp = positives.filter((s) => s.score >= cut).length
    const fn = positives.length - tp
    const fp = negatives.filter((s) => s.score >= cut).length
    const tn = negatives.length - fp
    const sensitivity = tp / (tp + fn || 1)
    const specificity = tn / (tn + fp || 1)
    const j = sensitivity + specificity - 1
    if (j > bestJ) {
      bestJ = j
      bestCut = cut
    }
  }
  return bestCut
}

export function computeCalibratedThresholds(samples: CalibrationSample[]): CalibratedThresholds {
  const usable = samples
    .filter((s) => typeof s.compositeScore === 'number' && s.compositeScore > 0)
    .filter((s) => s.outcome?.decision && COUNTS.includes(s.outcome.decision))
    .map((s) => ({
      score: s.compositeScore,
      positive: POSITIVE.includes(s.outcome!.decision),
    }))

  if (usable.length < MIN_SAMPLE) {
    return {
      thresholds: DEFAULT_THRESHOLDS,
      applied: false,
      sampleSize: usable.length,
      hireShift: 0,
      reason: `Using default bar — ${usable.length}/${MIN_SAMPLE} recorded outcomes needed to calibrate.`,
    }
  }

  const learnedCut = learnHireCut(usable, DEFAULT_THRESHOLDS.hire)
  // Blend learned cut with the default, then clamp the drift.
  const blendedHire = DEFAULT_THRESHOLDS.hire * (1 - BLEND) + learnedCut * BLEND
  const clampedHire = Math.round(
    Math.max(
      DEFAULT_THRESHOLDS.hire - MAX_DRIFT,
      Math.min(DEFAULT_THRESHOLDS.hire + MAX_DRIFT, blendedHire)
    )
  )
  const hireShift = clampedHire - DEFAULT_THRESHOLDS.hire

  // Preserve the spacing between bands so strong_hire/maybe move with hire.
  const strongGap = DEFAULT_THRESHOLDS.strong_hire - DEFAULT_THRESHOLDS.hire
  const maybeGap = DEFAULT_THRESHOLDS.hire - DEFAULT_THRESHOLDS.maybe
  const thresholds: VerdictThresholds = {
    strong_hire: Math.min(95, clampedHire + strongGap),
    hire: clampedHire,
    maybe: Math.max(30, clampedHire - maybeGap),
  }

  const direction = hireShift > 0 ? 'stricter' : hireShift < 0 ? 'more lenient' : 'unchanged'
  return {
    thresholds,
    applied: hireShift !== 0,
    sampleSize: usable.length,
    hireShift,
    reason:
      hireShift === 0
        ? `Calibrated on ${usable.length} outcomes — default bar already matches your hiring decisions.`
        : `Calibrated on ${usable.length} outcomes — hire bar moved ${Math.abs(hireShift)} pts ${direction} to match who you actually advanced.`,
  }
}
