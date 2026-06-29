/**
 * Salary / comp intelligence — pure, client-safe.
 *
 * Intervue holds something no salary site does: comp paired with a *verified
 * proof score* at the moment of hire (HireSignal). This turns that into
 * benchmarks both sides of the marketplace can act on:
 *   candidate → "at your proof level, people get hired around ₹X"
 *   recruiter → "candidates at this bar were hired around ₹X"
 */

export interface HireSignalLite {
  skill: string
  proofScoreAtHire: number
  hiredSalaryLPA: number
}

export interface CompBand {
  label: string
  min: number // proof score lower bound (inclusive)
  max: number // proof score upper bound (inclusive)
  sampleSize: number
  medianLpa: number | null
  p25Lpa: number | null
  p75Lpa: number | null
}

export interface CompBenchmark {
  skill: string | null
  sampleSize: number
  bands: CompBand[]
  /** band the queried proof score falls into, if provided */
  yourBand: CompBand | null
  /** point estimate for the queried proof score, interpolated across bands */
  predictedLpa: number | null
}

const BAND_DEFS: { label: string; min: number; max: number }[] = [
  { label: 'Below 60', min: 0, max: 59 },
  { label: '60–69', min: 60, max: 69 },
  { label: '70–79', min: 70, max: 79 },
  { label: '80–89', min: 80, max: 89 },
  { label: '90+', min: 90, max: 100 },
]

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null
  if (sorted.length === 1) return sorted[0]
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export function computeCompBenchmark(
  signals: HireSignalLite[],
  opts: { skill?: string; proofScore?: number } = {}
): CompBenchmark {
  // Only hires with a real salary tell us anything.
  let usable = signals.filter((s) => s.hiredSalaryLPA && s.hiredSalaryLPA > 0)
  if (opts.skill) {
    const sk = opts.skill.toLowerCase()
    usable = usable.filter((s) => s.skill?.toLowerCase() === sk)
  }

  const bands: CompBand[] = BAND_DEFS.map((def) => {
    const inBand = usable
      .filter((s) => s.proofScoreAtHire >= def.min && s.proofScoreAtHire <= def.max)
      .map((s) => s.hiredSalaryLPA)
      .sort((a, b) => a - b)
    return {
      label: def.label,
      min: def.min,
      max: def.max,
      sampleSize: inBand.length,
      medianLpa: percentile(inBand, 0.5),
      p25Lpa: percentile(inBand, 0.25),
      p75Lpa: percentile(inBand, 0.75),
    }
  })

  let yourBand: CompBand | null = null
  let predictedLpa: number | null = null
  if (typeof opts.proofScore === 'number') {
    yourBand = bands.find((b) => opts.proofScore! >= b.min && opts.proofScore! <= b.max) || null
    // Interpolate across band medians for a smoother point estimate.
    const pts = bands
      .filter((b) => b.medianLpa != null)
      .map((b) => ({ x: (b.min + b.max) / 2, y: b.medianLpa as number }))
    if (pts.length === 1) predictedLpa = Math.round(pts[0].y)
    else if (pts.length > 1) {
      const x = opts.proofScore
      if (x <= pts[0].x) predictedLpa = Math.round(pts[0].y)
      else if (x >= pts[pts.length - 1].x) predictedLpa = Math.round(pts[pts.length - 1].y)
      else {
        for (let i = 0; i < pts.length - 1; i++) {
          if (x >= pts[i].x && x <= pts[i + 1].x) {
            const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x)
            predictedLpa = Math.round(pts[i].y + t * (pts[i + 1].y - pts[i].y))
            break
          }
        }
      }
    }
  }

  return {
    skill: opts.skill || null,
    sampleSize: usable.length,
    bands,
    yourBand,
    predictedLpa,
  }
}

export function formatLpa(lpa: number | null): string {
  if (lpa == null) return '—'
  return `₹${lpa.toFixed(lpa >= 10 ? 0 : 1)} LPA`
}
