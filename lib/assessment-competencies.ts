/**
 * Pure competency data — no server imports, safe to import from client components.
 * The scoring engine and the recruiter authoring UI both read from here.
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
export const RATING_TO_SCORE: Record<number, number> = { 1: 20, 2: 45, 3: 68, 4: 85, 5: 97 }

export function competenciesForFormat(format: string): CompetencyDef[] {
  return (COMPETENCY_BLUEPRINTS[format] || COMPETENCY_BLUEPRINTS.coding).competencies
}
