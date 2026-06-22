import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { InterviewSession } from '@/lib/models/InterviewSession'
import { User } from '@/lib/models/User'

const BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await connectDB()

  const user = await User.findById(session.user.id)
    .select('subscriptionTier subscriptionStatus')
    .lean() as { subscriptionTier: string; subscriptionStatus: string } | null

  const isPro = user?.subscriptionTier === 'pro' && user?.subscriptionStatus === 'active'
  if (!isPro) {
    return NextResponse.json({ error: 'Share links require Intervue Pro', code: 'UPGRADE_REQUIRED' }, { status: 403 })
  }

  const interview = await InterviewSession.findOne({ _id: id, userId: session.user.id })
  if (!interview) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (interview.status !== 'completed') {
    return NextResponse.json({ error: 'Session must be completed to share' }, { status: 400 })
  }

  if (!interview.shareToken) {
    interview.shareToken = randomBytes(32).toString('hex')
    await interview.save()
  }

  return NextResponse.json({ shareUrl: `${BASE}/interview/report/shared/${interview.shareToken}` })
}
