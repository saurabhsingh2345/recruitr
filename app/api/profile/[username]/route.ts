import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { InterviewSession } from '@/lib/models/InterviewSession'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  try {
    await connectDB()

    const user = await User.findOne({ username })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const profile = await Profile.findOne({ userId: user._id, isPublic: true })
    if (!profile) return NextResponse.json({ error: 'Profile not found or private' }, { status: 404 })

    // Fetch completed sessions for rigor visibility + progression timeline
    const sessions = await InterviewSession.find({
      userId: user._id,
      status: 'completed',
    })
      .select('targetSkill format scores completedAt rigorConditions scoreUpdate insightReport.specializationImpact')
      .sort({ completedAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({
      user: {
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      profile: {
        parsedSkills: profile.parsedSkills,
        specializations: profile.specializations || [],
        projects: profile.projects,
        experiences: profile.experiences,
        educations: profile.educations,
        cohortPercentile: profile.cohortPercentile,
        targetRole: profile.targetRole,
        yearsOfExperience: profile.yearsOfExperience,
        location: profile.location,
        bio: profile.bio,
        portfolioProjects: profile.portfolioProjects || [],
        portfolioTheme: profile.portfolioTheme || null,
        portfolioCustomization: profile.portfolioCustomization || {},
        updatedAt: profile.updatedAt,
      },
      sessions,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
