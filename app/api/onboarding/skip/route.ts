import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectDB()
    // No upsert — the profile must already exist at this point (GitHub was just connected).
    // Using upsert here could fail silently if required fields are missing.
    await Profile.updateOne(
      { userId: session.user.id },
      { $set: { onboardingComplete: true, onboardingStep: 99 } }
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[onboarding/skip]', err)
    return NextResponse.json({ error: 'Failed to skip' }, { status: 500 })
  }
}
