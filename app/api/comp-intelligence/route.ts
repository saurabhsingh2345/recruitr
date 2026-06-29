import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { HireSignal } from '@/lib/models/HireSignal'
import { computeCompBenchmark, type HireSignalLite } from '@/lib/comp-intelligence'

/**
 * Comp benchmark from verified hire data.
 * GET /api/comp-intelligence?skill=Go&proofScore=78
 * Returns salary bands by proof score (the proprietary comp-vs-proof signal).
 * Privacy: only ever returns aggregates, and only when a band has enough hires.
 */
const MIN_SAMPLE = 3 // never reveal comp from fewer than 3 hires in a band

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const skill = searchParams.get('skill') || undefined
    const proofScoreRaw = searchParams.get('proofScore')
    const proofScore = proofScoreRaw ? Number(proofScoreRaw) : undefined

    await connectDB()

    const filter: Record<string, unknown> = { hiredSalaryLPA: { $gt: 0 } }
    if (skill) filter.skill = { $regex: `^${skill}$`, $options: 'i' }

    const signals = (await HireSignal.find(filter)
      .select('skill proofScoreAtHire hiredSalaryLPA')
      .lean()) as unknown as HireSignalLite[]

    const benchmark = computeCompBenchmark(signals, { skill, proofScore })

    // Suppress thin bands to protect individual comp.
    const safeBands = benchmark.bands.map((b) =>
      b.sampleSize >= MIN_SAMPLE
        ? b
        : { ...b, medianLpa: null, p25Lpa: null, p75Lpa: null }
    )
    const yourBandSafe =
      benchmark.yourBand && benchmark.yourBand.sampleSize >= MIN_SAMPLE ? benchmark.yourBand : null

    return NextResponse.json({
      ...benchmark,
      bands: safeBands,
      yourBand: yourBandSafe,
      predictedLpa: benchmark.sampleSize >= MIN_SAMPLE ? benchmark.predictedLpa : null,
      hasEnoughData: benchmark.sampleSize >= MIN_SAMPLE,
    })
  } catch (err) {
    console.error('Comp intelligence error:', err)
    return NextResponse.json({ error: 'Failed to compute benchmark' }, { status: 500 })
  }
}
