import { generateText } from 'ai'
import { getModel } from '@/lib/groq'
import { COMPETENCY_BLUEPRINTS, ANCHOR_LADDER, RATING_TO_SCORE } from '@/lib/assessment-competencies'

/**
 * Rubric-anchored, evidence-cited assessment scoring.
 *
 * The core idea: LLMs rate far more consistently on a small *anchored* scale
 * (1-5 with written descriptors) than they do emitting a free 0-100 number.
 * So the model rates each competency 1-5 with a verbatim evidence quote and a
 * confidence flag, and WE compute the 0-100 scores deterministically from the
 * ratings and competency weights. This removes the "everything is 65" noise.
 *
 * Competency blueprints + anchor ladder live in ./assessment-competencies
 * (pure data, client-safe).
 */

export { COMPETENCY_BLUEPRINTS, ANCHOR_LADDER } from '@/lib/assessment-competencies'
export type { CompetencyDef } from '@/lib/assessment-competencies'

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
