import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { RoleSpec } from '@/lib/models/RoleSpec'

const AVG_GAIN_PER_SESSION = 6 // conservative estimate

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await Profile.findOne({ userId: session.user.id }).lean<any>()
  if (!profile) return NextResponse.json({ unlockPaths: [] })

  const mySkills = new Map<string, number>(
    (profile.parsedSkills || []).map((s: { name: string; proofScore: number }) => [
      s.name.toLowerCase(),
      Number(s.proofScore),
    ])
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openRoles = await RoleSpec.find({ status: 'active' }).lean<any[]>()

  // For each skill in any open role that the candidate doesn't fully clear:
  const skillUnlockMap = new Map<
    string,
    { currentScore: number; targetScore: number; unlockSet: Set<string>; format: string }
  >()

  for (const role of openRoles) {
    const mustHave = role.mustHave || []

    // Check how many skills the candidate currently fails
    const failedSkills = mustHave.filter((req: { skill: string; minScore: number }) => {
      const myScore = mySkills.get(req.skill.toLowerCase()) ?? 0
      return myScore < req.minScore
    })

    for (const failed of failedSkills) {
      const skillKey = failed.skill.toLowerCase()
      const existing = skillUnlockMap.get(skillKey)
      const myScore = mySkills.get(skillKey) ?? 0
      const targetScore = failed.minScore

      // Check if fixing ONLY this skill would clear the rest of the role's gates
      const otherFails = failedSkills.filter(
        (f: { skill: string }) => f.skill.toLowerCase() !== skillKey
      )

      if (otherFails.length === 0) {
        // This is the ONLY barrier for this role
        if (!existing) {
          skillUnlockMap.set(skillKey, {
            currentScore: myScore,
            targetScore,
            unlockSet: new Set([role._id.toString()]),
            format: inferFormat(failed.skill),
          })
        } else {
          existing.unlockSet.add(role._id.toString())
          existing.targetScore = Math.min(existing.targetScore, targetScore)
        }
      }
    }
  }

  const unlockPaths = Array.from(skillUnlockMap.entries())
    .map(([skillName, data]) => {
      const delta = Math.max(0, data.targetScore - data.currentScore)
      return {
        skill: skillName,
        currentScore: Math.round(data.currentScore),
        targetScore: data.targetScore,
        unlockCount: data.unlockSet.size,
        sessionCount: Math.ceil(delta / AVG_GAIN_PER_SESSION),
        recommendedFormat: data.format,
      }
    })
    .filter((p) => p.unlockCount > 0 && p.sessionCount > 0)
    .sort((a, b) => b.unlockCount - a.unlockCount)
    .slice(0, 8)

  return NextResponse.json({ unlockPaths })
}

function inferFormat(skill: string): string {
  const lower = skill.toLowerCase()
  if (/kubernetes|docker|terraform|aws|gcp|azure|devops/i.test(lower)) return 'gap'
  if (/system.?design|architecture|distributed/i.test(lower)) return 'system_design'
  if (/react|vue|angular|typescript|javascript|css|html/i.test(lower)) return 'coding'
  return 'coding'
}
