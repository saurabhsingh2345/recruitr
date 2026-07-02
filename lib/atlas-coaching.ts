import type { ICareerGoal } from '@/lib/models/Profile'

interface SkillRow {
  name: string
  proofScore: number
}

const VERIFIED_CARD_MIN_SCORE = 70
const VERIFIED_CARD_MIN_SESSIONS = 5

export interface CoachingNudge {
  headline: string
  body: string
  prioritySkill: string | null
  sessionsNeeded: number | null
  targetRole: string | null
  ctaLabel: string
  ctaHref: string
}

export function buildCoachingNudge(input: {
  skills: SkillRow[]
  careerGoal?: ICareerGoal | null
  sessionCount: number
  verifiedCardEligible?: boolean
}): CoachingNudge | null {
  const { skills, careerGoal, sessionCount } = input
  if (!skills.length) {
    return {
      headline: 'Start your first interview',
      body: 'Complete one AI session to turn your profile into verified proof recruiters trust.',
      prioritySkill: null,
      sessionsNeeded: 1,
      targetRole: careerGoal?.targetRole || null,
      ctaLabel: 'Start interview',
      ctaHref: '/interview/new',
    }
  }

  const sorted = [...skills].sort((a, b) => a.proofScore - b.proofScore)
  const weakest = sorted[0]
  const targetRole = careerGoal?.targetRole || null

  // Verified card progress
  if (sessionCount < VERIFIED_CARD_MIN_SESSIONS) {
    const remaining = VERIFIED_CARD_MIN_SESSIONS - sessionCount
    return {
      headline: `${remaining} session${remaining !== 1 ? 's' : ''} to Verified Card`,
      body: targetRole
        ? `You're building toward ${targetRole}. ${remaining} more verified session${remaining !== 1 ? 's' : ''} unlock your shareable Verified Card.`
        : `Complete ${remaining} more session${remaining !== 1 ? 's' : ''} to unlock your Verified Card.`,
      prioritySkill: weakest.name,
      sessionsNeeded: remaining,
      targetRole,
      ctaLabel: 'Continue practicing',
      ctaHref: `/interview/new?skill=${encodeURIComponent(weakest.name)}&format=gap`,
    }
  }

  const belowBar = skills.filter((s) => s.proofScore < VERIFIED_CARD_MIN_SCORE)
  if (belowBar.length > 0 && targetRole) {
    const focus = belowBar[0]
    const gap = VERIFIED_CARD_MIN_SCORE - focus.proofScore
    return {
      headline: `Push ${focus.name} toward your ${targetRole} goal`,
      body: `${focus.name} is at ${Math.round(focus.proofScore)}/100. Two gap sessions could add ~${Math.min(gap, 15)} pts and strengthen your verified profile.`,
      prioritySkill: focus.name,
      sessionsNeeded: 2,
      targetRole,
      ctaLabel: `Practice ${focus.name}`,
      ctaHref: `/interview/new?skill=${encodeURIComponent(focus.name)}&format=gap`,
    }
  }

  if (weakest.proofScore < 75) {
    return {
      headline: `Level up ${weakest.name}`,
      body: `Your lowest verified skill is ${weakest.name} (${Math.round(weakest.proofScore)}/100). A focused gap session is the fastest way to improve.`,
      prioritySkill: weakest.name,
      sessionsNeeded: 1,
      targetRole,
      ctaLabel: `Start gap session`,
      ctaHref: `/interview/new?skill=${encodeURIComponent(weakest.name)}&format=gap`,
    }
  }

  return null
}
