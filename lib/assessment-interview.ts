import { COMPETENCY_BLUEPRINTS } from './assessment-scoring'
import { renderBankDirective } from './assessment-question-bank'

/** Formats where the candidate writes & runs real code. */
export const ASSESS_CODING_FORMATS = ['coding', 'gap']

/** Coding protocol — ported from the candidate flow so assessment coding rounds
 * are graded on code that actually ran, and the model emits a parseable score. */
export const ASSESS_CODING_PROTOCOL = `

CODING PROTOCOL:
- Pose concrete coding challenges. Each must include: a function signature, 1-2 input/output examples, and constraints.
- When the candidate submits code via [CODE SUBMISSION], evaluate in this order:
  1. State whether the core logic is correct or incorrect and why.
  2. Call out missed edge cases (empty input, negatives, overflow, etc.).
  3. Comment on time and space complexity.
  4. On its own line, output exactly: **Correctness: X/10** (0 = wrong, 10 = optimal, all cases handled).
  5. Then pose the next challenge (harder if they did well) or ask them to optimize.
- If no code is submitted after 2 exchanges, remind them the editor is available.`

/**
 * Pillar 2 — the directive that makes every candidate comparable (must cover the
 * same competencies) while being probed adaptively (difficulty ramps with skill).
 * Appended to INTERVIEW_SYSTEM_PROMPT in both the start and respond routes.
 */
export function buildAssessDirective(opts: { format: string; role: string; instructions?: string }): string {
  const blueprint = COMPETENCY_BLUEPRINTS[opts.format] || COMPETENCY_BLUEPRINTS.coding
  const competencyLines = blueprint.competencies
    .map((c) => `  - ${c.label}: ${c.definition}`)
    .join('\n')

  const coding = ASSESS_CODING_FORMATS.includes(opts.format) ? ASSESS_CODING_PROTOCOL : ''
  const bankDirective = renderBankDirective(opts.format, opts.role)
  const instructionLine = opts.instructions?.trim()
    ? `\nRECRUITER INSTRUCTIONS FOR THIS ROUND (highest priority): ${opts.instructions.trim()}`
    : ''

  return `

STRUCTURED ASSESSMENT — this is a formal hiring evaluation for the role: ${opts.role}. A hiring manager will read the scored result, so gather real evidence.

COMPETENCIES YOU MUST GATHER EVIDENCE ON (distribute your questions to cover ALL of them before the round ends):
${competencyLines}

ADAPTIVE DIFFICULTY:
- Open at a moderate baseline for the role. If the candidate answers strongly, escalate — push deeper and add constraints ("good — now what if the input doesn't fit in memory?"). If they struggle, hold the level and probe fundamentals before moving on.
- Never let one thread consume the whole round; you are responsible for touching every competency above.
- One focused question at a time. Keep them moving.${bankDirective}${instructionLine}${coding}`
}
