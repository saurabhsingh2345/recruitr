/**
 * Panel — the Hiring-Committee Agent (fourth agent, alongside Atlas/Scout/Fit).
 *
 * A real hiring decision is rarely one signal. Panel aggregates the independent
 * "panelist" lenses on a candidate — each assessment round (its own competency
 * read), the integrity signal, and any human interviewer notes — into a single
 * committee brief: where panelists AGREE, where they DIVERGE (the conversations
 * worth having in a debrief), and a synthesized recommendation.
 *
 * Like the other agents, the deterministic facts (scores, verdicts) come from
 * data; the LLM only synthesizes the narrative, constrained to the evidence.
 */

import { generateText } from 'ai'
import { getModel } from '@/lib/groq'

export interface PanelistSignal {
  /** label for this lens, e.g. "Round 1 · Coding" or "Human · Jane (eng)" */
  source: string
  verdictOrScore: string // e.g. "78/100" or "Hire"
  /** per-competency reads: "Problem solving 4/5", "Code correctness 2/5" */
  competencies: string[]
  notes?: string // free-text (esp. for human panelists)
}

export interface PanelBrief {
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire'
  consensus: string[] // points panelists agree on
  divergence: string[] // where signals conflict — debrief these
  risks: string[]
  debriefQuestions: string[]
  summary: string // 1-2 sentence committee verdict
  generatedAt: string
}

const EMPTY_BRIEF: Omit<PanelBrief, 'generatedAt'> = {
  recommendation: 'maybe',
  consensus: [],
  divergence: [],
  risks: [],
  debriefQuestions: [],
  summary: '',
}

export async function convenePanel(input: {
  role: string
  candidateName: string
  composite: number
  panelists: PanelistSignal[]
}): Promise<PanelBrief> {
  const panelBlock = input.panelists
    .map(
      (p, i) =>
        `PANELIST ${i + 1} — ${p.source} (${p.verdictOrScore})\n` +
        `  competencies: ${p.competencies.join('; ') || 'n/a'}` +
        (p.notes ? `\n  notes: ${p.notes.slice(0, 500)}` : '')
    )
    .join('\n\n')

  const prompt = `You are Panel, an AI hiring-committee facilitator. Multiple independent panelists assessed one candidate for the role "${input.role}". Synthesize their signals into a committee brief a hiring manager can act on. Weigh agreement, surface genuine conflicts, and do not average away a serious dissent.

CANDIDATE: ${input.candidateName} (overall composite ${input.composite}/100)

PANELIST SIGNALS:
${panelBlock}

Return ONLY valid JSON (no markdown):
{
  "recommendation": "strong_hire|hire|maybe|no_hire",
  "consensus": ["<a point most/all panelists agree on>", "..."],
  "divergence": ["<a place panelists genuinely disagree, naming which lens saw what>", "..."],
  "risks": ["<a concrete risk of hiring this person>", "..."],
  "debriefQuestions": ["<a sharp question for the live debrief to resolve a divergence or risk>", "..."],
  "summary": "<1-2 sentences: the committee's synthesized verdict and the deciding factor>"
}`

  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt,
      maxOutputTokens: 700,
      temperature: 0.4,
    })
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<PanelBrief>
      const rec = (['strong_hire', 'hire', 'maybe', 'no_hire'] as const).includes(
        parsed.recommendation as 'strong_hire'
      )
        ? (parsed.recommendation as PanelBrief['recommendation'])
        : 'maybe'
      const arr = (v: unknown) =>
        (Array.isArray(v) ? v : []).map((x) => String(x).slice(0, 300)).slice(0, 6)
      return {
        recommendation: rec,
        consensus: arr(parsed.consensus),
        divergence: arr(parsed.divergence),
        risks: arr(parsed.risks),
        debriefQuestions: arr(parsed.debriefQuestions),
        summary: String(parsed.summary || '').slice(0, 400),
        generatedAt: new Date().toISOString(),
      }
    }
  } catch (err) {
    console.error('[panel] convenePanel failed:', err)
  }
  return { ...EMPTY_BRIEF, generatedAt: new Date().toISOString() }
}
