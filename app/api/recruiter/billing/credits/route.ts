import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { CREDIT_PACKS } from '@/lib/stripe'

/** Recruiter's assessment-credit balance + available packs. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const user = await User.findById(session.user.id)
    .select('role assessmentCredits assessmentCreditsPurchased')
    .lean() as { role: string; assessmentCredits?: number; assessmentCreditsPurchased?: number } | null
  if (!user || user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })
  }

  return NextResponse.json({
    credits: user.assessmentCredits ?? 0,
    purchased: user.assessmentCreditsPurchased ?? 0,
    packs: CREDIT_PACKS.map((p) => ({
      id: p.id,
      name: p.name,
      credits: p.credits,
      priceInr: p.priceInr,
      perUnit: Math.round(p.priceInr / p.credits),
      available: Boolean(p.priceId),
    })),
  })
}
