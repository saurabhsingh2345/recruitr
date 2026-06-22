/**
 * Atlas — the Candidate Agent.
 *
 * Works for the candidate, never for us or the recruiter. It evaluates a role
 * against the candidate's verified evidence + private preferences and answers
 * recruiter asks. The hard gates come from computeFit() (deterministic, can't be
 * faked); the LLM only writes reasoning, answers asks FROM EVIDENCE, and crafts
 * the candidate-facing message. If the model is unavailable, deterministic
 * fallbacks keep the protocol functioning.
 */

import { generateText } from 'ai'
import { getModel } from '@/lib/groq'
import { computeFit, type CandidateSnapshot, type RoleSnapshot, type FitGates } from './fit'

export interface AtlasEvaluation {
  gates: FitGates
  reasoning: string
  answers: { ask: string; answer: string; evidenceIds: string[] }[]
  surfacingMessage: string   // shown to the human candidate if mutualFit
}

function evidenceCorpus(candidate: CandidateSnapshot): string {
  return candidate.skills
    .map(
      (s) =>
        `- ${s.name} (verified score ${Math.round(s.proofScore)}/100). Evidence: ${
          s.evidence.slice(0, 3).join('; ') || 'interview sessions'
        }`
    )
    .join('\n')
}

/** Deterministic fallback reasoning when the LLM is unavailable. */
function fallbackReasoning(gates: FitGates, role: RoleSnapshot): string {
  if (!gates.mutualFit) {
    const reasons: string[] = []
    if (!gates.techBarCleared) {
      const missing = gates.skillMatches.filter((m) => !m.cleared).map((m) => m.skill)
      reasons.push(`technical bar not cleared (${missing.join(', ')})`)
    }
    if (!gates.compOverlap) reasons.push('compensation below your floor')
    if (!gates.locationMatch) reasons.push('location mismatch')
    if (!gates.stageMatch) reasons.push('company stage outside your preference')
    if (gates.dealbreakerHit) reasons.push('hits one of your dealbreakers')
    return `Not a fit — ${reasons.join('; ')}. I declined on your behalf so you weren't bothered.`
  }
  const cleared = gates.skillMatches
    .filter((m) => m.cleared)
    .map((m) => `${m.skill} ${m.candidateScore}`)
    .join(', ')
  return `Strong fit for ${role.title}. Your verified skills clear the bar (${cleared}), comp and location align with your preferences.`
}

function fallbackSurfacing(role: RoleSnapshot, company: string, blind: boolean): string {
  const who = blind ? 'A hiring team' : company || 'A company'
  return `${who} is hiring a ${role.title}. I checked it against your preferences and it's a genuine match on skills, comp, and location. Want me to connect you?`
}

export async function atlasEvaluate(
  candidate: CandidateSnapshot,
  role: RoleSnapshot,
  asks: string[],
  company: string,
  blind: boolean
): Promise<AtlasEvaluation> {
  const gates = computeFit(candidate, role)

  // If the candidate has hidden themselves, Atlas never engages.
  if (candidate.discoverability === 'invisible') {
    return {
      gates: { ...gates, mutualFit: false },
      reasoning: 'Candidate is not discoverable.',
      answers: [],
      surfacingMessage: '',
    }
  }

  const corpus = evidenceCorpus(candidate)

  // Build the LLM prompt — strictly evidence-grounded.
  const prompt = `You are Atlas, an AI agent representing a software engineer to recruiters.
You must be truthful and may ONLY use the verified evidence below. Never invent skills or experience.

VERIFIED EVIDENCE:
${corpus}

ROLE: ${role.title} at ${blind ? '[company hidden]' : company}
Must-have skills: ${role.mustHave.map((m) => `${m.skill}≥${m.minScore}`).join(', ') || 'none specified'}
Deterministic fit result: ${gates.mutualFit ? 'MUTUAL FIT' : 'NOT A FIT'} (fit score ${gates.score})
Gate details: techBar=${gates.techBarCleared}, comp=${gates.compOverlap}, location=${gates.locationMatch}, stage=${gates.stageMatch}, dealbreaker=${gates.dealbreakerHit}

RECRUITER ASKS:
${asks.length ? asks.map((a, i) => `${i + 1}. ${a}`).join('\n') : '(none)'}

Return ONLY valid JSON:
{
  "reasoning": "1-2 sentences explaining the fit verdict for the candidate, grounded in evidence",
  "answers": [{"ask": "the ask", "answer": "evidence-based answer, or 'No verified evidence for this'", "skills": ["skill names you used"]}],
  "surfacingMessage": "if mutual fit, a warm 1-2 sentence message to the candidate inviting them to connect; else empty string"
}`

  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt,
      maxOutputTokens: 700,
    })
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as {
        reasoning?: string
        answers?: { ask: string; answer: string; skills?: string[] }[]
        surfacingMessage?: string
      }
      // Map skill names the LLM used back to evidence IDs (skill names act as refs here).
      const answers = (parsed.answers || []).map((a) => ({
        ask: a.ask,
        answer: a.answer,
        evidenceIds: (a.skills || []).filter((skill) =>
          candidate.skills.some((s) => s.name.toLowerCase() === skill.toLowerCase())
        ),
      }))
      return {
        gates,
        reasoning: parsed.reasoning || fallbackReasoning(gates, role),
        answers,
        surfacingMessage: gates.mutualFit
          ? parsed.surfacingMessage || fallbackSurfacing(role, company, blind)
          : '',
      }
    }
  } catch (err) {
    console.error('[atlas] LLM evaluation failed, using deterministic fallback:', err)
  }

  // Deterministic fallback
  return {
    gates,
    reasoning: fallbackReasoning(gates, role),
    answers: asks.map((ask) => ({
      ask,
      answer: 'I can answer this once Atlas has model access. The verified evidence is on the profile.',
      evidenceIds: [],
    })),
    surfacingMessage: gates.mutualFit ? fallbackSurfacing(role, company, blind) : '',
  }
}
