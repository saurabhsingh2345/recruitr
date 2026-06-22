import { NextRequest, NextResponse } from 'next/server'
import type { PipelineStage } from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const skill = searchParams.get('skill') || null
  const city = searchParams.get('city') || null
  const limit = 20

  try {
    await connectDB()

    const pipeline: PipelineStage[] = [
      { $match: { isPublic: { $ne: false }, discoverability: { $ne: 'invisible' } } },
    ]

    if (skill) {
      pipeline.push({
        $match: {
          parsedSkills: {
            $elemMatch: { name: { $regex: skill, $options: 'i' } },
          },
        },
      })
    }

    if (city) {
      pipeline.push({ $match: { location: { $regex: city, $options: 'i' } } })
    }

    pipeline.push({
      $addFields: {
        sortScore: skill
          ? {
              $let: {
                vars: {
                  sk: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$parsedSkills',
                          as: 's',
                          cond: {
                            $regexMatch: { input: '$$s.name', regex: skill, options: 'i' },
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: '$$sk.proofScore',
              },
            }
          : { $avg: '$parsedSkills.proofScore' },
      },
    })

    pipeline.push(
      { $match: { sortScore: { $gt: 0 } } },
      { $sort: { sortScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          username: '$user.username',
          name: '$user.name',
          avatarUrl: '$user.avatarUrl',
          score: '$sortScore',
          cohortPercentile: 1,
          vouchedBadge: 1,
          location: 1,
          targetRole: '$user.targetRole',
        },
      }
    )

    const results = await Profile.aggregate(pipeline)

    return NextResponse.json({
      leaderboard: results.map((r, i) => ({ ...r, rank: i + 1 })),
      skill,
      city,
      generatedAt: new Date(),
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
