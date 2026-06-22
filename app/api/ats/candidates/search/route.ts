import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'

// ATS API — authenticated via x-api-key header
// Same query logic as recruiter search

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.ATS_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const skill = searchParams.get('skill') || ''
  const minScore = parseInt(searchParams.get('minScore') || '0', 10)
  const location = searchParams.get('location') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
  const skip = (page - 1) * limit

  try {
    await connectDB()

    const profileQuery: Record<string, unknown> = { isPublic: { $ne: false } }
    if (skill) {
      profileQuery['parsedSkills'] = {
        $elemMatch: {
          name: { $regex: skill, $options: 'i' },
          ...(minScore > 0 ? { proofScore: { $gte: minScore } } : {}),
        },
      }
    }
    if (location) {
      profileQuery['location'] = { $regex: location, $options: 'i' }
    }

    const profiles = await Profile.find(profileQuery)
      .sort({ cohortPercentile: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Profile.countDocuments(profileQuery)

    const candidates = await Promise.all(
      profiles.map(async (profile) => {
        const user = await User.findById(profile.userId)
          .select('username name avatarUrl openToWork')
          .lean()
        if (!user || !user.openToWork) return null

        const skills: { name: string; proofScore: number }[] = profile.parsedSkills || []
        const topSkills = skills
          .sort((a, b) => b.proofScore - a.proofScore)
          .slice(0, 5)
          .map((s) => ({ name: s.name, score: Math.round(s.proofScore) }))

        return {
          username: user.username,
          name: user.name,
          avatarUrl: user.avatarUrl,
          profileUrl: `${process.env.NEXTAUTH_URL || 'https://intervue.dev'}/p/${user.username}`,
          targetRole: profile.targetRole || '',
          location: profile.location || '',
          yearsOfExperience: profile.yearsOfExperience || 0,
          cohortPercentile: Math.round(profile.cohortPercentile || 0),
          topSkills,
        }
      })
    )

    return NextResponse.json({
      candidates: candidates.filter(Boolean),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('ATS search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
