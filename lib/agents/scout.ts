/**
 * Scout — the Recruiter Agent.
 *
 * Turns a messy JD or short description into a structured RoleSpec ("the bar"),
 * and drafts grounded outreach. Sourcing + screening (which need DB access) live
 * in the handshake orchestration layer; Scout here owns the LLM-shaped reasoning.
 */

import { generateText } from 'ai'
import { getModel } from '@/lib/groq'

export interface StructuredRole {
  title: string
  seniority: string
  mustHave: { skill: string; minScore: number }[]
  niceHave: { skill: string; minScore: number }[]
  compMinLpa: number
  compMaxLpa: number
  locations: string[]
  stage: string
  domain: string
  teamContext: string
  dealbreakers: string[]
}

const EMPTY_ROLE: StructuredRole = {
  title: '',
  seniority: 'mid',
  mustHave: [],
  niceHave: [],
  compMinLpa: 0,
  compMaxLpa: 0,
  locations: [],
  stage: '',
  domain: '',
  teamContext: '',
  dealbreakers: [],
}

export async function scoutStructureRole(
  rawJd: string,
  company: string
): Promise<StructuredRole> {
  const prompt = `You are Scout, an AI sourcing agent. Convert this job description into a precise hiring bar.
Map requirements to concrete technical skills with a minimum proof score (0-100; senior ≈ 80, mid ≈ 65, junior ≈ 50).

COMPANY: ${company}
JOB DESCRIPTION:
${rawJd.slice(0, 4000)}

Return ONLY valid JSON:
{
  "title": "role title",
  "seniority": "junior|mid|senior|staff|lead",
  "mustHave": [{"skill": "Go", "minScore": 80}],
  "niceHave": [{"skill": "Kubernetes", "minScore": 60}],
  "compMinLpa": number (₹ LPA, 0 if unknown),
  "compMaxLpa": number (₹ LPA, 0 if unknown),
  "locations": ["Bangalore", "remote"],
  "stage": "seed|seriesA|seriesB|seriesC+|public or ''",
  "domain": "fintech|devtools|... or ''",
  "teamContext": "1 sentence on the team",
  "dealbreakers": []
}`

  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt,
      maxOutputTokens: 800,
    })
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<StructuredRole>
      return {
        ...EMPTY_ROLE,
        ...parsed,
        mustHave: (parsed.mustHave || []).filter((m) => m.skill),
        niceHave: (parsed.niceHave || []).filter((m) => m.skill),
        locations: parsed.locations || [],
        dealbreakers: parsed.dealbreakers || [],
      }
    }
  } catch (err) {
    console.error('[scout] structureRole failed, returning empty scaffold:', err)
  }
  return { ...EMPTY_ROLE }
}

export async function scoutDraftOutreach(
  candidateName: string,
  roleTitle: string,
  company: string,
  topEvidence: string
): Promise<string> {
  const prompt = `You are Scout, writing a short, warm, personalized recruiter outreach message.
Reference the candidate's actual work. No fluff, no corporate speak. 2-3 sentences. End with a soft question.

Candidate: ${candidateName}
Role: ${roleTitle} at ${company}
Their notable work: ${topEvidence}

Return only the message text.`
  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt,
      maxOutputTokens: 250,
    })
    return text.trim()
  } catch {
    return `Hi ${candidateName.split(' ')[0]}, I came across your verified Intervue profile and your work stood out for a ${roleTitle} role we're hiring at ${company}. Would you be open to a quick conversation?`
  }
}
