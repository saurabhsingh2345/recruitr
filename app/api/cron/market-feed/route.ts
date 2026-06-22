/**
 * Cron: daily market intelligence aggregation.
 * Runs at 02:00 UTC. Aggregates skill demand from active RoleSpecs + Profile scores.
 * Stores results in MarketFeed collection (TTL = 48 hours).
 */

import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { RoleSpec } from '@/lib/models/RoleSpec'
import { Profile } from '@/lib/models/Profile'
import { MarketFeed } from '@/lib/models/MarketFeed'

export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Aggregate skill demand from active roles
  const roleAgg = await RoleSpec.aggregate([
    { $match: { status: 'active' } },
    { $unwind: '$mustHave' },
    {
      $group: {
        _id: { $toLower: '$mustHave.skill' },
        roleCount: { $sum: 1 },
        avgMinScore: { $avg: '$mustHave.minScore' },
      },
    },
  ])

  // Aggregate candidate supply from profiles
  const candidateAgg = await Profile.aggregate([
    { $unwind: '$parsedSkills' },
    {
      $group: {
        _id: { $toLower: '$parsedSkills.name' },
        candidateCount: { $sum: 1 },
        avgProofScore: { $avg: '$parsedSkills.proofScore' },
        topScore: { $max: '$parsedSkills.proofScore' },
      },
    },
  ])

  // Build maps
  const roleMap = new Map<string, { roleCount: number; avgMinScore: number }>()
  for (const r of roleAgg) roleMap.set(r._id, r)

  const candMap = new Map<string, { candidateCount: number; avgProofScore: number; topScore: number }>()
  for (const c of candidateAgg) candMap.set(c._id, c)

  // Merge and compute demandScore
  const allSkills = new Set([...roleMap.keys(), ...candMap.keys()])

  // Get previous feed to compute delta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevFeed = await MarketFeed.find({}).lean<any[]>()
  const prevMap = new Map(prevFeed.map((f) => [f.skill, f.demandScore]))

  const ttlExpiry = new Date(Date.now() + 48 * 3600 * 1000)
  const now = new Date()

  const ops = []
  for (const skill of allSkills) {
    const role = roleMap.get(skill)
    const cand = candMap.get(skill)

    // Demand score: 60% from role count, 40% from score gap (high demand, few candidates)
    const roleWeight = Math.min(100, (role?.roleCount || 0) * 10)
    const scarcityWeight =
      cand && role
        ? Math.max(0, 100 - (cand.avgProofScore / (role.avgMinScore || 70)) * 50)
        : 0
    const demandScore = Math.round(roleWeight * 0.6 + scarcityWeight * 0.4)

    const prevScore = prevMap.get(skill) ?? demandScore
    const demandDelta = demandScore - prevScore

    ops.push({
      updateOne: {
        filter: { skill },
        update: {
          $set: {
            skill,
            demandScore,
            demandDelta,
            activeRoles: role?.roleCount || 0,
            avgProofScore: Math.round(cand?.avgProofScore || 0),
            candidateCount: cand?.candidateCount || 0,
            topCohortPct: cand?.topScore || 0,
            generatedAt: now,
            ttlExpiry,
          },
        },
        upsert: true,
      },
    })
  }

  if (ops.length > 0) {
    await MarketFeed.bulkWrite(ops)
  }

  return NextResponse.json({ processed: ops.length, skills: allSkills.size })
}
