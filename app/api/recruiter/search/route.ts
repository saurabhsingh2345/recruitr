import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'

export async function POST(req: NextRequest) {
  try {
    const { query, skills = [], minScore = 0, targetRole = '', page = 1 } = await req.json()

    await connectDB()

    // Build filter
    const filter: Record<string, unknown> = { isPublic: true }

    if (skills.length > 0) {
      // Each skill must match individually — $and ensures ALL required skills are present,
      // not just any one of them
      filter['$and'] = skills.map((skill: string) => ({
        parsedSkills: {
          $elemMatch: {
            name: { $regex: skill, $options: 'i' },
            proofScore: { $gte: minScore },
          },
        },
      }))
    }

    if (targetRole) {
      filter['targetRole'] = { $regex: targetRole, $options: 'i' }
    }

    const limit = 12
    const skip = (page - 1) * limit

    const profiles = await Profile.find(filter)
      .select('userId githubUsername parsedSkills projects cohortPercentile targetRole yearsOfExperience bio location')
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Profile.countDocuments(filter)

    // Enrich with user data
    const userIds = profiles.map((p) => p.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select('name username avatarUrl openToWork lastSessionDate')
      .lean()

    const userMap = new Map(users.map((u) => [u._id.toString(), u]))

    const enriched = profiles.map((p) => {
      const user = userMap.get(p.userId.toString()) as { name: string; username: string; avatarUrl: string; openToWork: boolean; lastSessionDate: Date | null } | undefined
      return {
        ...p,
        user: user ? {
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl,
          openToWork: user.openToWork,
          lastSessionDate: user.lastSessionDate,
        } : null,
        topSkills: p.parsedSkills
          ?.sort((a: { proofScore: number }, b: { proofScore: number }) => b.proofScore - a.proofScore)
          .slice(0, 4) || [],
      }
    })

    if (query) {
      const q = query.toLowerCase()
      enriched.sort((a, b) => {
        const aScore = a.topSkills.some((s: { name: string }) => s.name.toLowerCase().includes(q)) ? 1 : 0
        const bScore = b.topSkills.some((s: { name: string }) => s.name.toLowerCase().includes(q)) ? 1 : 0
        return bScore - aScore
      })
    }

    return NextResponse.json({
      candidates: enriched,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error('Recruiter search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
