import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { stripe, PRO_PRICE_ID } from '@/lib/stripe'

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST() {
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  if (!PRO_PRICE_ID) return NextResponse.json({ error: 'Pro price not configured' }, { status: 503 })

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const user = await User.findById(session.user.id)
    .select('email name stripeCustomerId subscriptionTier subscriptionStatus')
    .lean() as {
      _id: unknown; email: string; name: string
      stripeCustomerId: string; subscriptionTier: string; subscriptionStatus: string
    } | null

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (user.subscriptionTier === 'pro' && user.subscriptionStatus === 'active') {
    return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
  }

  // Reuse existing Stripe customer or create a new one
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
    mode: 'subscription',
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${BASE}/settings?tab=billing&checkout=success`,
    cancel_url: `${BASE}/settings?tab=billing`,
    metadata: { userId: String(user._id) },
    subscription_data: { metadata: { userId: String(user._id) } },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
