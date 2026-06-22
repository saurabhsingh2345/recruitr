import { generateText } from 'ai'
import { getModel } from './groq'

export interface CompanyStyle {
  company: string
  jdSnippet: string
  style: string
}

export async function analyzeCompanyStyle(jd: string): Promise<CompanyStyle> {
  const snippet = jd.slice(0, 1500)

  try {
    const { text } = await generateText({
      model: await getModel(),
      prompt: `Analyze this job description and return ONLY a JSON object (no markdown) with:
- "company": string — inferred company name or "Unknown Company"
- "style": string — 2-3 sentences describing the interview style to adopt. Include: technical depth (low/medium/high), focus areas from the JD, and any culture signals (fast-paced, process-oriented, etc.)

Job description:
${snippet}

Return only the JSON object.`,
      maxOutputTokens: 200,
    })

    const cleaned = text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleaned)
    return {
      company: parsed.company || 'Unknown Company',
      jdSnippet: snippet.slice(0, 300),
      style: parsed.style || '',
    }
  } catch {
    return {
      company: 'Unknown Company',
      jdSnippet: snippet.slice(0, 300),
      style: 'Conduct a standard technical interview matching the job requirements described.',
    }
  }
}
