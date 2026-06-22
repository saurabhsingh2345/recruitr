import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { BadgeEvent } from '@/lib/models/BadgeEvent'
import { Notification } from '@/lib/models/Notification'
import { createNotification } from '@/lib/notifications'

/** POST /api/recruiter/candidates/[id]/reveal — unmask a candidate identity after blind screening */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'recruiter') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  await connectDB()

  const [user, profile] = await Promise.all([
    User.findById(id).select('name username avatarUrl email openToWork discoverability').lean(),
    Profile.findOne({ userId: id }).select('targetRole location cohortPercentile yearsOfExperience').lean(),
  ])

  if (!user || (user as { discoverability?: string }).discoverability === 'invisible') {
    return NextResponse.json({ error: 'Not found or not discoverable' }, { status: 404 })
  }

  // Log reveal for audit
  BadgeEvent.create({
    type: 'badge_serve',
    username: session.user.id,
    skill: `reveal:${id}`,
    referer: '',
    at: new Date(),
  }).catch(() => {})

  // Notify candidate — deduplicate: max one notification per 24h per candidate
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const alreadyNotified = await Notification.exists({
    userId: id,
    type: 'recruiter_viewed',
    createdAt: { $gte: since },
  })
  if (!alreadyNotified) {
    const recruiterUser = await User.findById(session.user.id).select('company').lean() as { company?: string } | null
    createNotification(
      id,
      'recruiter_viewed',
      'A recruiter viewed your profile',
      `Someone from ${recruiterUser?.company || 'a company'} looked at your profile.`,
      '/agent'
    ).catch(() => {})
  }

  return NextResponse.json({ user, profile })
}
