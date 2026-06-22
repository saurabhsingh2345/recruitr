import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  await Profile.findOneAndUpdate(
    { userId: session.user.id },
    { $set: { onboardingComplete: true, onboardingStep: 99 } },
    { upsert: true }
  )
  return NextResponse.json({ ok: true })
}
