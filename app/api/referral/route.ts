import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { ensureReferralCode, claimReferral } from '@/lib/referrals'

/** GET /api/referral — return the current user's referral info */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const code = await ensureReferralCode(session.user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(session.user.id).lean<any>()

  // Count referred users and how many completed 3+ sessions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const referred = await User.find({ referredBy: session.user.id }).select('_id').lean<any[]>()
  const referredIds = referred.map((u) => u._id.toString())

  const completedCounts = await Promise.all(
    referredIds.map((uid) =>
      InterviewSession.countDocuments({ userId: uid, status: 'completed' })
    )
  )

  const referrals = referredIds.map((id, i) => ({
    userId: id,
    sessionsCompleted: completedCounts[i],
    milestoneReached: completedCounts[i] >= 3,
  }))

  const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  return NextResponse.json({
    referralCode: code,
    referralUrl: `${BASE}/onboarding?ref=${code}`,
    referralCount: referrals.length,
    completedCount: referrals.filter((r) => r.milestoneReached).length,
    isVouched: user?.isVouched || false,
    vouchedCount: user?.vouchedCount || 0,
    referrals,
  })
}

/** POST /api/referral/claim — candidate claims a referral code after signing up */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  await claimReferral(session.user.id, code)
  return NextResponse.json({ success: true })
}
