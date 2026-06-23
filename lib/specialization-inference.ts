/**
 * Specialization inference engine.
 * After 5+ sessions, clusters topics into sub-domains and scores them.
 * Output is written to profile.specializations[].
 */

import { getModel } from '@/lib/groq'
import { generateText } from 'ai'

export interface SessionSummary {
  id: string
  skill: string
  format: string
  score: number
  completedAt: Date
  strengths: string[]
  gaps: string[]
  aiVerdict: string
  repoLinks: string[]
}

export interface InferredSpecialization {
  name: string
  skill: string
  score: number
  scoreHistory: Array<{ score: number; at: Date; sessionId: string }>
  evidence: { repoLinks: string[]; sessionIds: string[] }
}

export async function inferSpecializations(
  sessions: SessionSummary[]
): Promise<InferredSpecialization[]> {
  if (sessions.length < 3) return []

  // Group by parent skill
  const bySkill: Record<string, SessionSummary[]> = {}
  for (const s of sessions) {
    if (!bySkill[s.skill]) bySkill[s.skill] = []
    bySkill[s.skill].push(s)
  }

  const results: InferredSpecialization[] = []

  for (const [skill, skillSessions] of Object.entries(bySkill)) {
    if (skillSessions.length < 2) continue

    const sessionSummary = skillSessions.map(s =>
      `Session (${s.format}, score ${s.score}, ${new Date(s.completedAt).toISOString().slice(0,10)}):
       Strengths: ${s.strengths.slice(0,2).join(', ')}
       Gaps: ${s.gaps.slice(0,2).join(', ')}
       Verdict: ${s.aiVerdict?.slice(0, 120) || 'N/A'}`
    ).join('\n\n')

    const prompt = `Analyze these ${skill} interview sessions and identify 2-3 specific technical specializations.

Sessions:
${sessionSummary}

Return ONLY valid JSON array (no markdown, no code fences):
[
  {
    "name": "<specific sub-domain, e.g. 'Concurrent Systems', 'API Design', 'Database Optimization'>",
    "score": <0-100, based on performance in this area>,
    "evidence_from_sessions": ["<session index 0-based>", ...]
  }
]

Rules:
- Names must be specific technical domains, NOT generic ("Problem Solving" is bad, "Distributed Systems" is good)
- Score reflects demonstrated depth, not just number of sessions
- Only include if there are at least 2 sessions showing this pattern
- Return 1-3 specializations maximum`

    try {
      const { text } = await generateText({
        model: await getModel(),
        prompt,
        maxOutputTokens: 600,
      })

      const match = text.match(/\[[\s\S]*\]/)
      if (!match) continue

      const parsed: Array<{ name: string; score: number; evidence_from_sessions: string[] }> =
        JSON.parse(match[0])

      for (const spec of parsed) {
        if (!spec.name || typeof spec.score !== 'number') continue

        // Map evidence_from_sessions indices to actual session IDs
        const evidenceIndices = (spec.evidence_from_sessions || []).map(Number).filter(n => !isNaN(n))
        const evidenceSessions = evidenceIndices.map(i => skillSessions[i]).filter(Boolean)

        const scoreHistory = evidenceSessions.map(s => ({
          score: s.score,
          at: new Date(s.completedAt),
          sessionId: s.id,
        }))

        const repoLinks = Array.from(
          new Set(evidenceSessions.flatMap(s => s.repoLinks))
        ).slice(0, 5)

        results.push({
          name: spec.name.trim(),
          skill,
          score: Math.round(Math.max(0, Math.min(100, spec.score))),
          scoreHistory,
          evidence: {
            repoLinks,
            sessionIds: evidenceSessions.map(s => s.id),
          },
        })
      }
    } catch {
      // inference failed for this skill — skip
    }
  }

  // Dedupe by name+skill, keep highest score
  const seen = new Map<string, InferredSpecialization>()
  for (const r of results) {
    const key = `${r.skill}::${r.name.toLowerCase()}`
    const existing = seen.get(key)
    if (!existing || r.score > existing.score) seen.set(key, r)
  }

  return Array.from(seen.values()).sort((a, b) => b.score - a.score)
}
