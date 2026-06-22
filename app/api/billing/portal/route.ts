import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { stripe } from '@/lib/stripe'

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST() {
  if (!stripe) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const user = await User.findById(session.user.id)
    .select('stripeCustomerId')
    .lean() as { _id: unknown; stripeCustomerId: string } | null

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${BASE}/settings?tab=billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
