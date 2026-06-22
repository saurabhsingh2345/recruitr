import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const user = await User.findById(session.user.id)
    .select('subscriptionTier subscriptionStatus subscriptionCurrentPeriodEnd stripeCustomerId')
    .lean() as {
      subscriptionTier: string; subscriptionStatus: string
      subscriptionCurrentPeriodEnd: Date | null; stripeCustomerId: string
    } | null

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    tier: user.subscriptionTier || 'free',
    status: user.subscriptionStatus || '',
    currentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
    hasCustomer: !!user.stripeCustomerId,
  })
}
