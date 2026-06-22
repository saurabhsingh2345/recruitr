import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { mustHave = [], locations = [] } = await req.json()

    await connectDB()

    const totalVerified = await Profile.countDocuments({ isPublic: true })

    // For each required skill: how many candidates have score >= required minimum?
    const skillGates = await Promise.all(
      mustHave.map(async (req: { skill: string; minScore: number }) => {
        const [above, aboveLower] = await Promise.all([
          Profile.countDocuments({
            parsedSkills: {
              $elemMatch: {
                name: { $regex: req.skill, $options: 'i' },
                proofScore: { $gte: req.minScore },
              },
            },
          }),
          Profile.countDocuments({
            parsedSkills: {
              $elemMatch: {
                name: { $regex: req.skill, $options: 'i' },
                proofScore: { $gte: Math.max(0, req.minScore - 10) },
              },
            },
          }),
        ])
        return {
          skill: req.skill,
          required: req.minScore,
          candidatesAboveBar: above,
          candidatesAt10Lower: aboveLower,
          sensitivityGain: aboveLower - above,
        }
      })
    )

    // Candidates passing ALL skill gates simultaneously
    let totalPassingAll = totalVerified
    if (mustHave.length > 0) {
      const andQuery = mustHave.map((r: { skill: string; minScore: number }) => ({
        parsedSkills: {
          $elemMatch: {
            name: { $regex: r.skill, $options: 'i' },
            proofScore: { $gte: r.minScore },
          },
        },
      }))
      totalPassingAll = await Profile.countDocuments({ $and: andQuery })
    }

    // Location breakdown (top 5 locations with matching candidates)
    const byLocation: { location: string; count: number }[] = []
    if (locations.length > 0) {
      for (const loc of locations.slice(0, 5)) {
        const count = await Profile.countDocuments({
          location: { $regex: loc, $options: 'i' },
          isPublic: true,
        })
        byLocation.push({ location: loc, count })
      }
    }

    // Bottleneck skill (lowest candidatesAboveBar)
    const bottleneckSkill =
      skillGates.length > 0
        ? skillGates.reduce((min, g) =>
            g.candidatesAboveBar < min.candidatesAboveBar ? g : min
          )
        : null

    return NextResponse.json({
      totalVerifiedCandidates: totalVerified,
      totalPassingAllGates: totalPassingAll,
      skillGates,
      byLocation,
      bottleneckSkill: bottleneckSkill?.skill || null,
    })
  } catch (err) {
    console.error('[forecast] error:', err)
    return NextResponse.json({ error: 'Failed to compute forecast' }, { status: 500 })
  }
}
