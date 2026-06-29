import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { stripe, getCreditPack } from '@/lib/stripe'

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

/** One-time Checkout to buy a pack of assessment credits (recruiter-only). */
export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { packId } = await req.json()
  const pack = getCreditPack(packId)
  if (!pack) return NextResponse.json({ error: 'Unknown pack' }, { status: 400 })
  if (!pack.priceId) return NextResponse.json({ error: 'Pack price not configured' }, { status: 503 })

  await connectDB()
  const user = await User.findById(session.user.id)
    .select('email name role stripeCustomerId')
    .lean() as { _id: unknown; email: string; name: string; role: string; stripeCustomerId: string } | null
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role !== 'recruiter') return NextResponse.json({ error: 'Recruiter access required' }, { status: 403 })

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: String(user._id) },
    })
    customerId = customer.id
    await User.findByIdAndUpdate(user._id, { stripeCustomerId: customerId })
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{ price: pack.priceId, quantity: 1 }],
    success_url: `${BASE}/recruiter/assessments?credits=success`,
    cancel_url: `${BASE}/recruiter/assessments`,
    // Metadata drives the credit grant in the webhook.
    metadata: {
      userId: String(user._id),
      kind: 'assessment_credits',
      credits: String(pack.credits),
      packId: pack.id,
    },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
