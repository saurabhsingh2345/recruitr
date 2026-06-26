import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const user = await User.findById(session.user.id).lean()
    const profile = await Profile.findOne({ userId: session.user.id })
      .select('-embeddings -rawResumeText')
      .lean()

    return NextResponse.json({ user, profile })
  } catch (error) {
    console.error('Me fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    await connectDB()

    const allowedProfileFields = ['targetRole', 'yearsOfExperience', 'location', 'bio', 'isPublic', 'portfolioTheme']
    const profileUpdate: Record<string, unknown> = {}

    for (const field of allowedProfileFields) {
      if (body[field] !== undefined) profileUpdate[field] = body[field]
    }

    // Portfolio projects (full replace)
    if (Array.isArray(body.portfolioProjects)) {
      profileUpdate.portfolioProjects = body.portfolioProjects
    }

    // Portfolio customization (merge)
    if (body.portfolioCustomization && typeof body.portfolioCustomization === 'object') {
      profileUpdate.portfolioCustomization = body.portfolioCustomization
    }

    if (Object.keys(profileUpdate).length > 0) {
      await Profile.findOneAndUpdate(
        { userId: session.user.id },
        { ...profileUpdate, updatedAt: new Date() }
      )
    }

    const userUpdate: Record<string, unknown> = {}
    for (const field of ['name', 'openToWork', 'company', 'jobTitle', 'companySize', 'openRoles', 'signupRef', 'signupSkill', 'signupFrom', 'emailBriefEnabled', 'notifReminders', 'notifRecruiterViews', 'notifScoreMilestones']) {
      if (body[field] !== undefined) userUpdate[field] = body[field]
    }
    if (body.role === 'recruiter' || body.role === 'candidate') {
      userUpdate.role = body.role
    }
    if (body.preferences !== undefined) userUpdate.preferences = body.preferences
    if (['open', 'passive', 'invisible'].includes(body.discoverability)) {
      userUpdate.discoverability = body.discoverability
    }
    // Upsert a single connection by source (e.g. { source:'linkedin', handle:'https://…' })
    // Non-GitHub sources require a Pro subscription
    if (body.connection && body.connection.source) {
      const { source, handle } = body.connection as { source: string; handle: string }
      if (source !== 'github') {
        const userTier = await User.findById(session.user.id)
          .select('subscriptionTier subscriptionStatus').lean() as
          { subscriptionTier: string; subscriptionStatus: string } | null
        const isPro = userTier?.subscriptionTier === 'pro' && userTier?.subscriptionStatus === 'active'
        if (!isPro) {
          return NextResponse.json(
            { error: 'Additional sources require Intervue Pro', code: 'UPGRADE_REQUIRED' },
            { status: 403 }
          )
        }
      }
      await User.findByIdAndUpdate(session.user.id, {
        $pull: { connections: { source } },
      })
      await User.findByIdAndUpdate(session.user.id, {
        $push: {
          connections: {
            source,
            handle: handle || '',
            status: 'connected',
            summary: '',
            lastSyncedAt: null,
          },
        },
      })
    }
    if (Object.keys(userUpdate).length > 0) {
      await User.findByIdAndUpdate(session.user.id, userUpdate)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
