/**
 * Deterministic fit calculation — the trust backbone of the Handshake Protocol.
 *
 * Hard gates (tech bar, comp, location, stage, dealbreakers) are computed from
 * real data, NOT from the LLM. An agent can never hallucinate these. The LLM
 * (Atlas) only writes the human-facing reasoning and answers free-text asks,
 * always constrained to evidence we actually hold.
 */

import type { ISkillBar } from '@/lib/models/RoleSpec'

export interface CandidateSnapshot {
  skills: { name: string; proofScore: number; evidence: string[] }[]
  specializations?: { name: string; skill: string; score: number }[]
  location: string
  preferences: {
    minCompLpa: number
    maxCompLpa: number
    locations: string[]
    stages: string[]
    domains: string[]
    dealbreakers: string[]
  }
  discoverability: 'open' | 'passive' | 'invisible'
}

export interface RoleSnapshot {
  mustHave: ISkillBar[]
  niceHave: ISkillBar[]
  compMinLpa: number
  compMaxLpa: number
  locations: string[]
  stage: string
  domain: string
  title: string
  teamContext: string
  dealbreakers: string[]
}

export interface SkillMatch {
  skill: string
  required: number
  candidateScore: number | null
  cleared: boolean
}

export interface FitGates {
  techBarCleared: boolean
  compOverlap: boolean
  locationMatch: boolean
  stageMatch: boolean
  dealbreakerHit: boolean
  mutualFit: boolean
  score: number
  skillMatches: SkillMatch[]
  niceHaveMatches: SkillMatch[]
}

/** Fuzzy skill lookup — "System Design" matches "system design", "Distributed Sys" ~ "Distributed Systems". */
function findSkill(
  skills: CandidateSnapshot['skills'],
  wanted: string
): { name: string; proofScore: number; evidence: string[] } | null {
  const w = wanted.toLowerCase().trim()
  // exact
  let hit = skills.find((s) => s.name.toLowerCase().trim() === w)
  if (hit) return hit
  // contains either way
  hit = skills.find((s) => {
    const n = s.name.toLowerCase().trim()
    return n.includes(w) || w.includes(n)
  })
  return hit || null
}

function evaluateBar(skills: CandidateSnapshot['skills'], bar: ISkillBar[]): SkillMatch[] {
  return bar.map((b) => {
    const found = findSkill(skills, b.skill)
    return {
      skill: b.skill,
      required: b.minScore,
      candidateScore: found ? Math.round(found.proofScore) : null,
      cleared: !!found && found.proofScore >= b.minScore,
    }
  })
}

export function computeFit(candidate: CandidateSnapshot, role: RoleSnapshot): FitGates {
  const prefs = candidate.preferences

  // ── Tech bar (hard gate) ──
  const skillMatches = evaluateBar(candidate.skills, role.mustHave)
  const niceHaveMatches = evaluateBar(candidate.skills, role.niceHave)

  // Check specialization gates (optional per skill bar)
  const specGatesCleared = role.mustHave.every(bar => {
    if (!bar.specialization || !bar.minSpecScore) return true
    const specs = candidate.specializations || []
    const match = specs.find(
      sp =>
        sp.skill.toLowerCase() === bar.skill.toLowerCase() &&
        sp.name.toLowerCase().includes(bar.specialization!.toLowerCase())
    )
    return !!match && match.score >= bar.minSpecScore!
  })

  const techBarCleared =
    (role.mustHave.length === 0 || skillMatches.every((m) => m.cleared)) && specGatesCleared

  // ── Comp overlap (hard gate) ──
  // The role must be able to pay at least the candidate's floor.
  // If candidate floor unset (0) → flexible → overlap.
  const compOverlap =
    prefs.minCompLpa <= 0 ||
    role.compMaxLpa <= 0 || // role didn't disclose a ceiling → treat as open
    role.compMaxLpa >= prefs.minCompLpa

  // ── Location (hard gate) ──
  const roleLocs = role.locations.map((l) => l.toLowerCase())
  const prefLocs = prefs.locations.map((l) => l.toLowerCase())
  const roleRemote = roleLocs.includes('remote')
  const prefRemote = prefLocs.includes('remote')
  const locationMatch =
    prefLocs.length === 0 ||           // candidate flexible
    roleLocs.length === 0 ||           // role flexible
    roleRemote || prefRemote ||        // either side remote-friendly
    roleLocs.some((l) => prefLocs.includes(l))

  // ── Stage (soft-ish gate) ──
  const prefStages = prefs.stages.map((s) => s.toLowerCase())
  const stageMatch =
    prefStages.length === 0 ||
    !role.stage ||
    prefStages.includes(role.stage.toLowerCase())

  // ── Dealbreakers (hard gate) ──
  const haystack = `${role.title} ${role.domain} ${role.teamContext}`.toLowerCase()
  const roleDealbreakers = role.dealbreakers.map((d) => d.toLowerCase())
  const dealbreakerHit =
    prefs.dealbreakers.some((d) => d && haystack.includes(d.toLowerCase())) ||
    // candidate's domain dealbreakers overlapping the role's own listed sensitive tags
    prefs.dealbreakers.some((d) => roleDealbreakers.includes(d.toLowerCase()))

  // ── Overall verdict ──
  const mutualFit =
    techBarCleared && compOverlap && locationMatch && stageMatch && !dealbreakerHit

  // ── Fit score (0-100) — only meaningful when mutualFit ──
  let score = 0
  if (mutualFit) {
    // base from how far above the bar the must-haves clear
    const margins = skillMatches.map((m) =>
      m.candidateScore != null ? Math.min(100, m.candidateScore) : 0
    )
    const avgMust = margins.length
      ? margins.reduce((a, b) => a + b, 0) / margins.length
      : 70
    // bonus for nice-to-haves cleared
    const niceCleared = niceHaveMatches.filter((m) => m.cleared).length
    const niceBonus = role.niceHave.length
      ? (niceCleared / role.niceHave.length) * 12
      : 0
    score = Math.round(Math.min(100, avgMust * 0.88 + niceBonus))
  }

  return {
    techBarCleared,
    compOverlap,
    locationMatch,
    stageMatch,
    dealbreakerHit,
    mutualFit,
    score,
    skillMatches,
    niceHaveMatches,
  }
}
