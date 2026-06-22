/**
 * Handshake orchestration — the agent-to-agent layer with DB access.
 *
 * sourceForRole(): Scout queries the verified pool for candidates worth an inquiry.
 * runHandshake():  Scout sends a fit inquiry → Atlas evaluates → verdict logged.
 *                  No human is bothered unless Atlas finds genuine mutual fit.
 */

import { connectDB } from '@/lib/mongodb'
import { User } from '@/lib/models/User'
import { Profile } from '@/lib/models/Profile'
import { RoleSpec, type IRoleSpec } from '@/lib/models/RoleSpec'
import { Handshake, type IHandshake } from '@/lib/models/Handshake'
import { atlasEvaluate } from './atlas'
import { createNotification } from '@/lib/notifications'
import type { CandidateSnapshot, RoleSnapshot } from './fit'

export function roleToSnapshot(role: IRoleSpec): RoleSnapshot {
  return {
    mustHave: role.mustHave,
    niceHave: role.niceHave,
    compMinLpa: role.compMinLpa,
    compMaxLpa: role.compMaxLpa,
    locations: role.locations,
    stage: role.stage,
    domain: role.domain,
    title: role.title,
    teamContext: role.teamContext,
    dealbreakers: role.dealbreakers,
  }
}

export async function buildCandidateSnapshot(
  userId: string
): Promise<{
  snapshot: CandidateSnapshot
  user: { _id: string; name: string; username: string; avatarUrl: string }
} | null> {
  await connectDB()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await User.findById(userId).lean<any>()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await Profile.findOne({ userId }).lean<any>()

  const snapshot: CandidateSnapshot = {
    skills: (profile?.parsedSkills || []).map(
      (s: { name: string; proofScore: number; evidence: string[] }) => ({
        name: s.name,
        proofScore: s.proofScore,
        evidence: s.evidence || [],
      })
    ),
    location: profile?.location || '',
    preferences: {
      minCompLpa: user.preferences?.minCompLpa || 0,
      maxCompLpa: user.preferences?.maxCompLpa || 0,
      locations: user.preferences?.locations || [],
      stages: user.preferences?.stages || [],
      domains: user.preferences?.domains || [],
      dealbreakers: user.preferences?.dealbreakers || [],
    },
    discoverability: user.discoverability || 'open',
  }

  return {
    snapshot,
    user: {
      _id: user._id.toString(),
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
    },
  }
}

/**
 * Scout sourcing: pre-filter the pool with a cheap DB query, then return candidate
 * userIds. The expensive fit logic runs per-candidate in runHandshake().
 */
export async function sourceForRole(role: IRoleSpec, limit = 25): Promise<string[]> {
  await connectDB()

  const query: Record<string, unknown> = { isPublic: { $ne: false } }

  // At least one must-have skill present above (bar - 10) as a coarse pre-filter.
  if (role.mustHave.length > 0) {
    query.parsedSkills = {
      $elemMatch: {
        $or: role.mustHave.map((m) => ({
          name: { $regex: m.skill, $options: 'i' },
          proofScore: { $gte: Math.max(0, m.minScore - 10) },
        })),
      },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = await Profile.find(query)
    .sort({ cohortPercentile: -1 })
    .limit(limit * 2)
    .select('userId')
    .lean<any[]>()

  const userIds = profiles.map((p) => p.userId.toString())

  // Exclude invisible candidates.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visible = await User.find({
    _id: { $in: userIds },
    discoverability: { $ne: 'invisible' },
    role: 'candidate',
  })
    .select('_id')
    .lean<any[]>()

  return visible.map((u) => u._id.toString()).slice(0, limit)
}

/**
 * Run one handshake for (role, candidate). Idempotent per pair.
 * Returns the persisted Handshake doc.
 */
export async function runHandshake(
  role: IRoleSpec,
  candidateId: string,
  asks: string[] = []
): Promise<IHandshake | null> {
  await connectDB()

  const built = await buildCandidateSnapshot(candidateId)
  if (!built) return null
  const { snapshot, user } = built

  const evaluation = await atlasEvaluate(
    snapshot,
    roleToSnapshot(role),
    asks,
    role.company,
    role.blind
  )

  const { gates, reasoning, answers, surfacingMessage } = evaluation

  const status = gates.mutualFit ? 'surfaced_to_candidate' : 'declined_by_atlas'

  const now = new Date()
  const snapshotAt = now

  const exchanges: IHandshake['exchanges'] = [
    {
      from: 'scout',
      kind: 'fit_inquiry',
      content: `Fit inquiry for ${role.title}${role.blind ? '' : ` at ${role.company}`}.`,
      evidenceSnapshot: [],
      at: now,
    },
    ...asks.map((ask) => ({
      from: 'scout' as const,
      kind: 'ask' as const,
      content: ask,
      evidenceSnapshot: [],
      at: now,
    })),
    ...answers.map((a) => ({
      from: 'atlas' as const,
      kind: 'answer' as const,
      content: `${a.ask} → ${a.answer}`,
      evidenceSnapshot: a.evidenceIds.map((skillName) => {
        const found = snapshot.skills.find(
          (s) => s.name.toLowerCase() === skillName.toLowerCase()
        )
        return { skillName, proofScore: found?.proofScore ?? 0, snapshotAt }
      }),
      at: now,
    })),
    {
      from: 'atlas',
      kind: 'verdict',
      content: reasoning,
      evidenceSnapshot: [],
      at: now,
    },
  ]

  const verdict = {
    mutualFit: gates.mutualFit,
    techBarCleared: gates.techBarCleared,
    compOverlap: gates.compOverlap,
    locationMatch: gates.locationMatch,
    stageMatch: gates.stageMatch,
    dealbreakerHit: gates.dealbreakerHit,
    skillMatches: gates.skillMatches.map((m) => ({
      skill: m.skill,
      required: m.required,
      candidateScore: m.candidateScore,
      cleared: m.cleared,
    })),
    reasoning,
    score: gates.score,
  }

  const doc = await Handshake.findOneAndUpdate(
    { roleSpecId: role._id!.toString(), candidateId },
    {
      $set: {
        roleSpecId: role._id!.toString(),
        recruiterId: role.recruiterId,
        candidateId,
        candidateName: user.name,
        candidateUsername: user.username,
        candidateAvatar: user.avatarUrl,
        roleTitle: role.title,
        company: role.blind ? '' : role.company,
        blind: role.blind,
        status,
        verdict,
        exchanges,
        surfacingMessage,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true }
  )

  if (gates.mutualFit) {
    const companyLabel = role.blind ? 'a company' : (role.company || 'a company')
    createNotification(
      candidateId,
      'handshake_surfaced',
      'A role matched you',
      `You matched ${role.title || 'a role'} at ${companyLabel} — they want to connect.`,
      '/agent'
    ).catch(() => {})
  }

  return doc
}
