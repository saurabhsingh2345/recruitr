import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { VerifiedCard } from '@/lib/models/VerifiedCard'
import { User } from '@/lib/models/User'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  await connectDB()

  const card = await VerifiedCard.findOne({ cardToken: token }).lean() as {
    userId: string; targetRole: string; targetLevel: string
    topSkills: { name: string; score: number; percentile: number }[]
    sessionCount: number; issuedAt: Date; cardToken: string; shareCount: number
  } | null

  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

  const user = await User.findById(card.userId).select('name username avatarUrl').lean() as {
    name: string; username: string; avatarUrl: string
  } | null

  // Increment share count (fire-and-forget)
  VerifiedCard.findOneAndUpdate({ cardToken: token }, { $inc: { shareCount: 1 } }).catch(() => {})

  return NextResponse.json({ card, user })
}
