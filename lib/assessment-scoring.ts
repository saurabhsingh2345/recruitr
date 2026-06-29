import { generateText } from 'ai'
import { getModel } from '@/lib/groq'

/**
 * Rubric-anchored, evidence-cited assessment scoring.
 *
 * The core idea: LLMs rate far more consistently on a small *anchored* scale
 * (1-5 with written descriptors) than they do emitting a free 0-100 number.
 * So the model rates each competency 1-5 with a verbatim evidence quote and a
 * confidence flag, and WE compute the 0-100 scores deterministically from the
 * ratings and competency weights. This removes the "everything is 65" noise.
 */

export interface CompetencyDef {
  key: string
  label: string
  definition: string
  weight: number
}

// Per-format competency blueprint. Weights are relative (normalized at compute time).
// Communication is deliberately weighted lower than the core role skill.
export const COMPETENCY_BLUEPRINTS: Record<string, { expertLabel: string; competencies: CompetencyDef[] }> = {
  coding: {
    expertLabel: 'staff software engineer',
    competencies: [
      { key: 'problem_solving', label: 'Problem solving', definition: 'Decomposes the problem, reasons about approach and complexity, handles edge cases.', weight: 3 },
      { key: 'code_correctness', label: 'Code correctness', definition: 'Solution actually works: correct logic, handles inputs, passes the cases discussed.', weight: 3 },
      { key: 'technical_depth', label: 'Technical depth', definition: 'Understands data structures, time/space tradeoffs, language idioms.', weight: 2 },
      { key: 'code_quality', label: 'Code quality', definition: 'Readable, well-structured, sensible naming, no needless complexity.', weight: 1 },
      { key: 'communication', label: 'Communication', definition: 'Narrates thinking, responds to nudges, asks clarifying questions.', weight: 1 },
    ],
  },
  system_design: {
    expertLabel: 'principal engineer',
    competencies: [
      { key: 'design_quality', label: 'Design quality', definition: 'Coherent architecture, right components, data model, API boundaries.', weight: 3 },
      { key: 'technical_depth', label: 'Technical depth', definition: 'Scaling, consistency, caching, failure modes, real tradeoffs named.', weight: 3 },
      { key: 'problem_solving', label: 'Problem solving', definition: 'Clarifies requirements, estimates load, drives toward a workable design.', weight: 2 },
      { key: 'communication', label: 'Communication', definition: 'Structures the discussion, justifies decisions, handles pushback.', weight: 1 },
    ],
  },
  project_deepdive: {
    expertLabel: 'senior engineer',
    competencies: [
      { key: 'technical_depth', label: 'Technical depth', definition: 'Genuinely understands the architecture and the why behind key decisions.', weight: 3 },
      { key: 'ownership_signal', label: 'Ownership', definition: 'Personally drove decisions and tradeoffs, not just a passenger on the team.', weight: 3 },
      { key: 'problem_solving', label: 'Problem solving', definition: 'Explains the hard problems faced and how they were resolved.', weight: 2 },
      { key: 'communication', label: 'Communication', definition: 'Explains complex work clearly to someone without context.', weight: 1 },
    ],
  },
  behavioural: {
    expertLabel: 'senior hiring manager',
    competencies: [
      { key: 'situation_clarity', label: 'Situation clarity', definition: 'Sets up a concrete, specific situation (not vague generalities).', weight: 2 },
      { key: 'action_quality', label: 'Action quality', definition: 'Describes specific actions THEY took and sound judgement under pressure.', weight: 3 },
      { key: 'impact_articulation', label: 'Impact', definition: 'Quantifies or concretely evidences the outcome and what they learned.', weight: 3 },
      { key: 'communication', label: 'Communication', definition: 'Structured, honest, reflective storytelling.', weight: 1 },
    ],
  },
  gap: {
    expertLabel: 'expert engineer',
    competencies: [
      { key: 'concept_clarity', label: 'Concept clarity', definition: 'Accurate mental model of the topic; no fundamental misconceptions.', weight: 3 },
      { key: 'technical_depth', label: 'Technical depth', definition: 'Can go beyond definitions into mechanism and tradeoffs.', weight: 3 },
      { key: 'problem_solving', label: 'Problem solving', definition: 'Applies the concept to a concrete scenario when probed.', weight: 2 },
      { key: 'communication', label: 'Communication', definition: 'Explains clearly and updates when corrected.', weight: 1 },
    ],
  },
  pm_case: {
    expertLabel: 'senior product manager',
    competencies: [
      { key: 'problem_framing', label: 'Problem framing', definition: 'Identifies the real user problem, segments, and success metrics.', weight: 3 },
      { key: 'prioritization_logic', label: 'Prioritization', definition: 'Makes defensible tradeoffs with clear reasoning, not feature lists.', weight: 3 },
      { key: 'insight_quality', label: 'Insight quality', definition: 'Non-obvious, sharp product insight grounded in the user.', weight: 2 },
      { key: 'communication', label: 'Communication', definition: 'Structured, crisp, leads the conversation.', weight: 1 },
    ],
  },
  design_critique: {
    expertLabel: 'senior product designer',
    competencies: [
      { key: 'ux_reasoning', label: 'UX reasoning', definition: 'Identifies real usability issues and reasons from user needs.', weight: 3 },
      { key: 'systems_thinking', label: 'Systems thinking', definition: 'Considers flows, edge cases, consistency, and second-order effects.', weight: 3 },
      { key: 'design_rationale', label: 'Design rationale', definition: 'Justifies choices with principles, not taste alone.', weight: 2 },
      { key: 'communication', label: 'Communication', definition: 'Articulates critique constructively and clearly.', weight: 1 },
    ],
  },
  ops_case: {
    expertLabel: 'senior operations lead',
    competencies: [
      { key: 'process_design', label: 'Process design', definition: 'Designs a workable, scalable process for the scenario.', weight: 3 },
      { key: 'resource_allocation', label: 'Resource allocation', definition: 'Allocates people/time/budget with sound prioritization.', weight: 3 },
      { key: 'risk_identification', label: 'Risk identification', definition: 'Anticipates failure modes and mitigations.', weight: 2 },
      { key: 'communication', label: 'Communication', definition: 'Structured, decisive, clear.', weight: 1 },
    ],
  },
  sales_discovery: {
    expertLabel: 'senior account executive',
    competencies: [
      { key: 'discovery_quality', label: 'Discovery quality', definition: 'Asks sharp questions that surface real pain and decision criteria.', weight: 3 },
      { key: 'objection_handling', label: 'Objection handling', definition: 'Handles pushback with empathy and reframes effectively.', weight: 3 },
      { key: 'value_articulation', label: 'Value articulation', definition: 'Connects the product to the prospect\'s specific value.', weight: 2 },
      { key: 'communication', label: 'Communication', definition: 'Builds rapport, listens, leads the conversation.', weight: 1 },
    ],
  },
}

// Shared anchor ladder. "Meets bar" (3) maps to a hireable score, not a 50.
export const ANCHOR_LADDER = `1 — No evidence or incorrect: unsupported claims, fundamental errors, or did not engage with the question.
2 — Below bar: surface-level or partial; notable gaps, misconceptions, or hand-waving.
3 — Meets bar: solid and correct fundamentals; the standard expected of someone hireable for this role.
4 — Strong: real depth, tradeoff awareness, handled follow-ups and probing well.
5 — Exceptional: senior-plus; nuanced, anticipated edge cases, reasoning the interviewer could learn from.`

// Rating → 0-100. Nonlinear so that "meets bar" (3) is a hireable ~68, not a coin-flip 50.
const RATING_TO_SCORE: Record<number, number> = { 1: 20, 2: 45, 3: 68, 4: 85, 5: 97 }

export interface CompetencyScore {
  key: string
  label: string
  rating: number // 1-5
  score: number // 0-100, derived
  weight: number
  evidence: string
  confidence: 'high' | 'medium' | 'low'
}

export interface AssessmentRoundResult {
  overallScore: number
  breakdown: Record<string, number>
  competencies: CompetencyScore[]
  strengths: string[]
  gaps: string[]
  studyRecommendations: string[]
  idealAnswers: Array<{ question: string; answer: string }>
  confidence: 'high' | 'medium' | 'low'
}

function clampRating(n: unknown): number {
  const r = Math.round(Number(n))
  if (!Number.isFinite(r)) return 1
  return Math.min(5, Math.max(1, r))
}

function normConfidence(c: unknown): 'high' | 'medium' | 'low' {
  const s = String(c || '').toLowerCase()
  if (s.startsWith('h')) return 'high'
  if (s.startsWith('l')) return 'low'
  return 'medium'
}

/**
 * Score one assessment round from its transcript using anchored, evidence-cited
 * competency ratings. The 0-100 numbers are computed deterministically here.
 */
export async function scoreAssessmentRound(opts: {
  transcript: string
  format: string
  role: string
  candidateTurns: number
  /** Executed-code submissions (Pillar 3). Their codeScore (0-10) is ground
   * truth and overrides the LLM's chat-based code_correctness rating. */
  codeSubmissions?: { codeScore?: number }[]
}): Promise<AssessmentRoundResult> {
  const blueprint = COMPETENCY_BLUEPRINTS[opts.format] || COMPETENCY_BLUEPRINTS.coding

  const competencyList = blueprint.competencies
    .map((c) => `- "${c.key}" (${c.label}): ${c.definition}`)
    .join('\n')

  const prompt = `You are a ${blueprint.expertLabel} running a rigorous, calibrated hiring evaluation for the role: ${opts.role}.
Rate the candidate ONLY on evidence in the transcript. Be strict and honest — most real candidates land at 2-3. Reserve 4-5 for genuinely strong evidence. Do not inflate.

ANCHOR SCALE (use these exact definitions for every competency):
${ANCHOR_LADDER}

COMPETENCIES TO RATE:
${competencyList}

RULES:
- For every competency, give an integer rating 1-5 and a VERBATIM short quote from the candidate as evidence (copy their words). If there is genuinely no evidence, rate 1 and set evidence to "No evidence in transcript".
- Set confidence to "low" when the transcript is thin or the signal is ambiguous, "high" when there is clear repeated evidence.
- Do NOT output an overall score — only per-competency ratings.

TRANSCRIPT:
${opts.transcript.slice(0, 12000)}

Return ONLY valid JSON (no markdown, no code fences):
{
  "competencies": [
    { "key": "<competency key>", "rating": <1-5>, "evidence": "<verbatim candidate quote>", "confidence": "high|medium|low" }
  ],
  "strengths": ["<specific, evidence-backed strength>"],
  "gaps": ["<specific gap with what was missing>"],
  "studyRecommendations": ["<actionable recommendation>"],
  "idealAnswers": [ { "question": "<a key question asked>", "answer": "<what a strong answer looks like>" } ]
}`

  let parsed: {
    competencies?: { key: string; rating: number; evidence?: string; confidence?: string }[]
    strengths?: string[]
    gaps?: string[]
    studyRecommendations?: string[]
    idealAnswers?: Array<{ question?: string; answer?: string }> | Record<string, string>
  } | null = null

  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt,
      maxOutputTokens: 1500,
      temperature: 0.3, // low temp → more consistent calibration
    })
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch {
    parsed = null
  }

  // Map LLM ratings back onto the blueprint (source of truth for keys/weights/labels).
  const ratedByKey = new Map<string, { rating: number; evidence?: string; confidence?: string }>()
  for (const c of parsed?.competencies || []) {
    if (c?.key) ratedByKey.set(c.key, c)
  }

  const competencies: CompetencyScore[] = blueprint.competencies.map((def) => {
    const rated = ratedByKey.get(def.key)
    // If the model didn't rate a competency at all, treat as low-confidence "meets bar"
    // rather than punishing the candidate for a model omission.
    const hasRating = rated && Number.isFinite(Number(rated.rating))
    const rating = hasRating ? clampRating(rated!.rating) : 3
    return {
      key: def.key,
      label: def.label,
      rating,
      score: RATING_TO_SCORE[rating],
      weight: def.weight,
      evidence: rated?.evidence?.trim() || (hasRating ? '' : 'Not assessed'),
      confidence: hasRating ? normConfidence(rated!.confidence) : 'low',
    }
  })

  // Pillar 3 — override code_correctness with executed-code ground truth.
  // Real test runs beat the LLM's read of the conversation. Blend 70% executed
  // / 30% LLM so genuinely correct code that the model under-rated still wins.
  const scoredSubs = (opts.codeSubmissions || []).filter((s) => typeof s.codeScore === 'number')
  if (scoredSubs.length > 0) {
    const cc = competencies.find((c) => c.key === 'code_correctness')
    if (cc) {
      const avgExec = scoredSubs.reduce((s, x) => s + (x.codeScore as number), 0) / scoredSubs.length
      const execScore = Math.round(avgExec * 10) // 0-10 → 0-100
      cc.score = Math.round(execScore * 0.7 + cc.score * 0.3)
      cc.confidence = 'high' // executed code is the strongest possible evidence
      cc.evidence = `${scoredSubs.length} code submission${scoredSubs.length !== 1 ? 's' : ''} executed, avg ${avgExec.toFixed(1)}/10 correctness`
    }
  }

  // Weighted 0-100 round score.
  const totalWeight = competencies.reduce((s, c) => s + c.weight, 0) || 1
  const overallScore = Math.round(
    competencies.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight
  )

  const breakdown: Record<string, number> = {}
  for (const c of competencies) breakdown[c.key] = c.score

  // Round confidence: blend the model's confidence flags with transcript depth.
  const confScore = competencies.reduce(
    (s, c) => s + (c.confidence === 'high' ? 1 : c.confidence === 'medium' ? 0.5 : 0),
    0
  ) / competencies.length
  let confidence: 'high' | 'medium' | 'low'
  if (opts.candidateTurns < 3) confidence = 'low' // too little signal regardless of model
  else if (confScore >= 0.66) confidence = 'high'
  else if (confScore >= 0.33) confidence = 'medium'
  else confidence = 'low'

  // Normalize idealAnswers (model may return object or array).
  const idealAnswers = (() => {
    const raw = parsed?.idealAnswers
    if (!raw) return []
    if (Array.isArray(raw)) {
      return raw.filter((x) => x?.question).map((x) => ({ question: x.question!, answer: String(x.answer ?? '') }))
    }
    return Object.entries(raw).map(([question, answer]) => ({ question, answer: String(answer) }))
  })()

  return {
    overallScore,
    breakdown,
    competencies,
    strengths: parsed?.strengths || [],
    gaps: parsed?.gaps || [],
    studyRecommendations: parsed?.studyRecommendations || [],
    idealAnswers,
    confidence,
  }
}
