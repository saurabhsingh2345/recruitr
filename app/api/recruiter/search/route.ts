import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Profile } from '@/lib/models/Profile'
import { User } from '@/lib/models/User'
import { BadgeEvent } from '@/lib/models/BadgeEvent'
import { searchCandidates } from '@/lib/typesense'
import crypto from 'crypto'

function maskCandidate(candidate: Record<string, unknown>): Record<string, unknown> {
  const id = (candidate._id || candidate.userId || '').toString()
  const hash = crypto.createHash('md5').update(id).digest('hex').slice(0, 6).toUpperCase()
  return {
    ...candidate,
    _id: id,
    user: candidate.user
      ? {
          name: `Candidate #${hash}`,
          username: `candidate-${hash.toLowerCase()}`,
          avatarUrl: null,
          openToWork: (candidate.user as Record<string, unknown>).openToWork,
          lastSessionDate: (candidate.user as Record<string, unknown>).lastSessionDate,
          _masked: true,
          _originalId: id,
        }
      : null,
    parsedSkills: (candidate.parsedSkills as { name: string; proofScore: number; evidence: string[] }[] || []).map((s) => ({
      ...s,
      evidence: s.evidence?.map((e: string) =>
        e.replace(/https?:\/\/[^\s]+/g, '[repo]').replace(/github\.com\/[^\s/]+/g, '[github]')
      ) || [],
    })),
    githubUsername: null,
    bio: (candidate.bio as string || '').slice(0, 80) || '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      query, skills = [], minScore = 0, targetRole = '',
      page = 1, blind = false, vouchedOnly = false,
      specialization = '', specSkill = '', minSpecScore = 0,
    } = await req.json()
    const session = await auth()

    // Semantic-first: Typesense ranks by intent (vector + keyword) and returns an
    // ordered list of userIds. We then hydrate those from MongoDB through the SAME
    // enrichment/masking pipeline so the response shape (and blind mode) is
    // identical to the keyword path. Falls back to Mongo entirely on miss/error.
    let semanticOrder: string[] | null = null
    if (query && query.trim()) {
      const tsHits = await searchCandidates({ q: query, skills, minScore, page, perPage: 12 })
      if (tsHits && tsHits.length) semanticOrder = tsHits.map((h) => h.userId)
    }

    await connectDB()

    // Build filter
    const filter: Record<string, unknown> = { isPublic: true }
    if (vouchedOnly) filter['vouchedBadge'] = true
    // In semantic mode, constrain to the candidates Typesense surfaced.
    if (semanticOrder) filter['userId'] = { $in: semanticOrder }

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

    // Specialization filter — narrow to candidates with proven sub-domain depth
    if (specialization && specSkill) {
      const andClauses = (filter['$and'] as unknown[]) || []
      andClauses.push({
        specializations: {
          $elemMatch: {
            skill: { $regex: specSkill, $options: 'i' },
            name: { $regex: specialization, $options: 'i' },
            ...(minSpecScore > 0 ? { score: { $gte: minSpecScore } } : {}),
          },
        },
      })
      filter['$and'] = andClauses
    }

    const limit = 12
    const skip = (page - 1) * limit

    const profiles = await Profile.find(filter)
      .select('userId githubUsername parsedSkills specializations projects cohortPercentile targetRole yearsOfExperience bio location')
      // Semantic mode is already paginated + ordered by Typesense; don't re-skip.
      .skip(semanticOrder ? 0 : skip)
      .limit(semanticOrder ? semanticOrder.length : limit)
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

    if (semanticOrder) {
      // Preserve Typesense's intent ranking.
      const rank = new Map(semanticOrder.map((id, i) => [id, i]))
      enriched.sort(
        (a, b) =>
          (rank.get(a.userId.toString()) ?? 999) - (rank.get(b.userId.toString()) ?? 999)
      )
    } else if (query) {
      const q = query.toLowerCase()
      enriched.sort((a, b) => {
        const aScore = a.topSkills.some((s: { name: string }) => s.name.toLowerCase().includes(q)) ? 1 : 0
        const bScore = b.topSkills.some((s: { name: string }) => s.name.toLowerCase().includes(q)) ? 1 : 0
        return bScore - aScore
      })
    }

    const finalCandidates = blind
      ? enriched.map((c) => maskCandidate(c as unknown as Record<string, unknown>))
      : enriched

    // Log blind reveals for audit if recruiter is authenticated
    if (blind && session?.user?.id) {
      BadgeEvent.create({
        type: 'badge_serve',
        username: session.user.id,
        skill: 'blind_search',
        referer: '',
        at: new Date(),
      }).catch(() => {})
    }

    return NextResponse.json({
      candidates: finalCandidates,
      total,
      pages: semanticOrder ? page + (finalCandidates.length === 12 ? 1 : 0) : Math.ceil(total / limit),
      currentPage: page,
      blind,
      source: semanticOrder ? 'semantic' : 'keyword',
    })
  } catch (error) {
    console.error('Recruiter search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
