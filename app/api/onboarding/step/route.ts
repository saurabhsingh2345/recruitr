import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { step } = await req.json()
  if (typeof step !== 'number') return NextResponse.json({ error: 'step must be a number' }, { status: 400 })

  await connectDB()
  await Profile.findOneAndUpdate(
    { userId: session.user.id },
    { $set: { onboardingStep: step } },
    { upsert: true }
  )
  return NextResponse.json({ ok: true })
}
