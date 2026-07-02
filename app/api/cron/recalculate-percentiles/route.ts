import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { recalculateAllCohortPercentiles } from '@/lib/cohort-percentile'

export const maxDuration = 120

/** Hourly-ish: refresh cohort percentiles for all public profiles. */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const result = await recalculateAllCohortPercentiles()
  return NextResponse.json({ ok: true, ...result })
}
