import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'

// GET — fetch current user's specializations
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const profile = await Profile.findOne({ userId: session.user.id }).select('specializations').lean()
  return NextResponse.json({ specializations: (profile as { specializations?: unknown[] })?.specializations || [] })
}

// PATCH — confirm, remove, or reorder specializations
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, name, skill } = body as { action: 'confirm' | 'remove'; name: string; skill: string }

  if (!action || !name || !skill) {
    return NextResponse.json({ error: 'action, name, and skill required' }, { status: 400 })
  }

  await connectDB()
  const profile = await Profile.findOne({ userId: session.user.id })
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  type SpecDoc = { name: string; skill: string; confirmedByUser: boolean }
  const specs: SpecDoc[] = profile.specializations || []

  if (action === 'confirm') {
    const idx = specs.findIndex(
      (s) => s.skill.toLowerCase() === skill.toLowerCase() && s.name.toLowerCase() === name.toLowerCase()
    )
    if (idx >= 0) specs[idx].confirmedByUser = true
    profile.specializations = specs
  } else if (action === 'remove') {
    profile.specializations = specs.filter(
      (s) => !(s.skill.toLowerCase() === skill.toLowerCase() && s.name.toLowerCase() === name.toLowerCase())
    )
  }

  await profile.save()
  return NextResponse.json({ specializations: profile.specializations })
}
