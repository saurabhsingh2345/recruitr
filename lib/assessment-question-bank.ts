/**
 * Pillar 2 (closed loop) — standardized question bank.
 *
 * Pure data, client-safe. The adaptive engine probes *on top* of these, but
 * every candidate for a given format is anchored on the SAME set of questions,
 * mapped to the same competencies. That is what makes a recruiter's side-by-side
 * comparison fair: "the AI went easier on candidate B" stops being a valid
 * objection because B got the same anchors.
 *
 * Each bank is versioned. The version a candidate was tested against is stored
 * on their invite round, so a later bank revision never silently breaks
 * comparability of historical results.
 *
 * Questions use {role} as a placeholder, substituted at runtime.
 */

export interface AnchorQuestion {
  id: string
  /** competency keys (from COMPETENCY_BLUEPRINTS) this anchor primarily probes */
  competencyKeys: string[]
  /** baseline = asked of everyone; stretch = asked only if they clear baseline */
  tier: 'baseline' | 'stretch'
  prompt: string
}

export interface QuestionBank {
  version: string
  anchors: AnchorQuestion[]
}

const BANKS: Record<string, QuestionBank> = {
  coding: {
    version: 'coding-v1',
    anchors: [
      { id: 'c1', competencyKeys: ['problem_solving', 'code_correctness'], tier: 'baseline', prompt: 'Pose a self-contained array/string manipulation problem (function signature + 2 examples + constraints). Have them code and submit a working solution.' },
      { id: 'c2', competencyKeys: ['technical_depth'], tier: 'baseline', prompt: 'Ask them to state the time and space complexity of their solution and justify it.' },
      { id: 'c3', competencyKeys: ['problem_solving', 'code_quality'], tier: 'stretch', prompt: 'Add a constraint that breaks their first approach (e.g. input no longer fits in memory, or a new edge case) and ask them to adapt the solution.' },
      { id: 'c4', competencyKeys: ['technical_depth', 'communication'], tier: 'stretch', prompt: 'Ask them to compare their chosen data structure against one alternative and explain the tradeoff.' },
    ],
  },
  system_design: {
    version: 'system_design-v1',
    anchors: [
      { id: 'sd1', competencyKeys: ['problem_solving', 'design_quality'], tier: 'baseline', prompt: 'Ask them to clarify requirements and estimate scale (users, QPS, data size) for the system before designing.' },
      { id: 'sd2', competencyKeys: ['design_quality'], tier: 'baseline', prompt: 'Have them sketch the high-level architecture: core components, data model, and API boundaries.' },
      { id: 'sd3', competencyKeys: ['technical_depth'], tier: 'stretch', prompt: 'Probe one scaling bottleneck (caching, sharding, or read/write split) and ask how they would handle it.' },
      { id: 'sd4', competencyKeys: ['technical_depth', 'communication'], tier: 'stretch', prompt: 'Introduce a failure mode (a component goes down) and ask how the system degrades and recovers.' },
    ],
  },
  project_deepdive: {
    version: 'project_deepdive-v1',
    anchors: [
      { id: 'pd1', competencyKeys: ['technical_depth'], tier: 'baseline', prompt: 'Ask them to pick their most technically demanding recent project and explain the architecture end to end.' },
      { id: 'pd2', competencyKeys: ['ownership_signal'], tier: 'baseline', prompt: 'Ask which specific decisions THEY personally drove and what alternatives they rejected.' },
      { id: 'pd3', competencyKeys: ['problem_solving'], tier: 'stretch', prompt: 'Ask about the single hardest bug or tradeoff and how they resolved it.' },
      { id: 'pd4', competencyKeys: ['technical_depth', 'communication'], tier: 'stretch', prompt: 'Ask what they would redesign with hindsight and why.' },
    ],
  },
  behavioural: {
    version: 'behavioural-v1',
    anchors: [
      { id: 'b1', competencyKeys: ['situation_clarity', 'action_quality'], tier: 'baseline', prompt: 'Ask for a specific time they faced a major conflict or setback at work (STAR). Get a concrete situation.' },
      { id: 'b2', competencyKeys: ['action_quality', 'impact_articulation'], tier: 'baseline', prompt: 'Probe the specific actions THEY took and the measurable outcome.' },
      { id: 'b3', competencyKeys: ['impact_articulation'], tier: 'stretch', prompt: 'Ask what they learned and what they would do differently next time.' },
      { id: 'b4', competencyKeys: ['action_quality', 'communication'], tier: 'stretch', prompt: 'Ask for a second example where they had to influence without authority.' },
    ],
  },
  gap: {
    version: 'gap-v1',
    anchors: [
      { id: 'g1', competencyKeys: ['concept_clarity'], tier: 'baseline', prompt: 'Open with a diagnostic question on the core concept to gauge their mental model.' },
      { id: 'g2', competencyKeys: ['technical_depth'], tier: 'baseline', prompt: 'Push past the definition into mechanism: ask HOW or WHY it works under the hood.' },
      { id: 'g3', competencyKeys: ['problem_solving'], tier: 'stretch', prompt: 'Give a concrete scenario and ask them to apply the concept to it.' },
      { id: 'g4', competencyKeys: ['concept_clarity', 'communication'], tier: 'stretch', prompt: 'Introduce a common misconception and see whether they catch and correct it.' },
    ],
  },
  pm_case: {
    version: 'pm_case-v1',
    anchors: [
      { id: 'pm1', competencyKeys: ['problem_framing'], tier: 'baseline', prompt: 'Present a product scenario and ask them to frame the user problem, target segment, and success metric.' },
      { id: 'pm2', competencyKeys: ['prioritization_logic'], tier: 'baseline', prompt: 'Ask them to propose and prioritize solutions with explicit tradeoff reasoning.' },
      { id: 'pm3', competencyKeys: ['insight_quality'], tier: 'stretch', prompt: 'Push for a non-obvious insight about the user or market they have not yet stated.' },
      { id: 'pm4', competencyKeys: ['prioritization_logic', 'communication'], tier: 'stretch', prompt: 'Add a constraint (half the resources, or a new competitor) and ask how the plan changes.' },
    ],
  },
  design_critique: {
    version: 'design_critique-v1',
    anchors: [
      { id: 'dc1', competencyKeys: ['ux_reasoning'], tier: 'baseline', prompt: 'Describe a real product flow in text and ask them to identify the usability issues.' },
      { id: 'dc2', competencyKeys: ['systems_thinking'], tier: 'baseline', prompt: 'Ask them to consider edge cases and second-order effects of the flow.' },
      { id: 'dc3', competencyKeys: ['design_rationale'], tier: 'stretch', prompt: 'Ask them to propose a redesign and justify it from design principles, not taste.' },
      { id: 'dc4', competencyKeys: ['ux_reasoning', 'communication'], tier: 'stretch', prompt: 'Ask how they would validate the redesign with users.' },
    ],
  },
  ops_case: {
    version: 'ops_case-v1',
    anchors: [
      { id: 'op1', competencyKeys: ['process_design'], tier: 'baseline', prompt: 'Present an operational challenge and ask them to design a workable process for it.' },
      { id: 'op2', competencyKeys: ['resource_allocation'], tier: 'baseline', prompt: 'Ask how they would allocate people, time, and budget under the given constraints.' },
      { id: 'op3', competencyKeys: ['risk_identification'], tier: 'stretch', prompt: 'Ask them to name the top failure modes and their mitigations.' },
      { id: 'op4', competencyKeys: ['process_design', 'communication'], tier: 'stretch', prompt: 'Scale the scenario 10x and ask what breaks and how they adapt.' },
    ],
  },
  sales_discovery: {
    version: 'sales_discovery-v1',
    anchors: [
      { id: 'sl1', competencyKeys: ['discovery_quality'], tier: 'baseline', prompt: 'Roleplay a prospect. Have them run discovery to surface real pain and decision criteria.' },
      { id: 'sl2', competencyKeys: ['value_articulation'], tier: 'baseline', prompt: 'Ask them to connect the product to the specific value for this prospect.' },
      { id: 'sl3', competencyKeys: ['objection_handling'], tier: 'stretch', prompt: 'Raise a real objection (price, timing, incumbent) and see how they handle it.' },
      { id: 'sl4', competencyKeys: ['discovery_quality', 'communication'], tier: 'stretch', prompt: 'Ask them to propose clear next steps and a close.' },
    ],
  },
}

export function getQuestionBank(format: string): QuestionBank {
  return BANKS[format] || BANKS.coding
}

/** Render the bank into a directive block, substituting the role. */
export function renderBankDirective(format: string, role: string): string {
  const bank = getQuestionBank(format)
  const line = (a: AnchorQuestion) =>
    `  [${a.tier === 'baseline' ? 'BASELINE' : 'STRETCH'}] ${a.prompt.replace(/\{role\}/g, role)}`
  const baseline = bank.anchors.filter((a) => a.tier === 'baseline').map(line).join('\n')
  const stretch = bank.anchors.filter((a) => a.tier === 'stretch').map(line).join('\n')

  return `

STANDARDIZED QUESTION SET (${bank.version}) — every candidate for this format gets the same anchors, so results are directly comparable:
BASELINE anchors — you MUST cover all of these with every candidate, in order, adapting wording to context but not substance:
${baseline}
STRETCH anchors — ask these only once the candidate has cleared the baseline well; they separate strong candidates from exceptional ones:
${stretch}
You MAY add short adaptive follow-up probes between anchors, but never skip a baseline anchor and never let a tangent replace one.`
}
