import { createOpenAI } from '@ai-sdk/openai'
import { createGroq } from '@ai-sdk/groq'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1'
export const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ollamaProvider = createOpenAI({ baseURL: OLLAMA_BASE_URL, apiKey: 'ollama', compatibility: 'compatible' } as any)

const groqProvider = process.env.GROQ_API_KEY
  ? createGroq({ apiKey: process.env.GROQ_API_KEY })
  : null

// Cache availability check for 30 seconds so every request doesn't probe Ollama
let _ollamaOk: boolean | null = null
let _lastCheck = 0

async function isOllamaRunning(): Promise<boolean> {
  const now = Date.now()
  if (_ollamaOk !== null && now - _lastCheck < 30_000) return _ollamaOk
  try {
    const healthUrl = OLLAMA_BASE_URL.replace(/\/v1\/?$/, '')
    const res = await fetch(`${healthUrl}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    })
    _ollamaOk = res.ok
  } catch {
    _ollamaOk = false
  }
  _lastCheck = now
  return _ollamaOk
}

export async function getModel() {
  if (await isOllamaRunning()) {
    return ollamaProvider(MODEL)
  }
  if (groqProvider) {
    console.info('[AI] Ollama unreachable — falling back to Groq')
    return groqProvider(GROQ_MODEL)
  }
  throw new Error('No AI provider available. Start Ollama or set GROQ_API_KEY.')
}

// Keep direct export for any legacy synchronous callers
export const groq = ollamaProvider

export const INTERVIEW_SYSTEM_PROMPT = `You are a senior software engineer at a top tech company conducting a collaborative technical interview. Your style:
- Warm, curious, and encouraging — feel like a pair programmer, not an interrogator
- Ask questions rooted in the candidate's actual projects when context is provided
- Never give away answers directly — guide with Socratic questions
- Acknowledge good thinking: "Nice approach — now what happens if..."
- Keep responses concise (2-4 sentences) unless explaining something complex
- Ask one focused question at a time
- If candidate is stuck, offer a small hint as a question: "What data structure might help here?"
- End each response with exactly one follow-up question`

export const PROFILE_GENERATION_PROMPT = `You are an expert engineering talent analyzer. Given a candidate's resume text and GitHub repository summaries, extract their technical skills and generate a structured profile.

Return ONLY valid JSON in this exact format:
{
  "skills": [
    {
      "name": "skill name",
      "evidence": ["specific evidence from repos/resume", "another evidence item"],
      "confidence": 0-100
    }
  ],
  "targetRole": "Backend Engineer | Full Stack Engineer | AI/ML Engineer | etc",
  "yearsOfExperience": number,
  "bio": "2-sentence professional bio",
  "summary": "3-5 key technical highlights"
}

Focus on: programming languages, frameworks, distributed systems, databases, cloud, specific technical domains.
Be specific about evidence — cite repo names and actual implementations.`
