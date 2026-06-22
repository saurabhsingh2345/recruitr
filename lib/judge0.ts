const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://ce.judge0.com'

export const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  go: 60,
  java: 62,
  cpp: 54,
  c: 50,
  rust: 73,
  ruby: 72,
}

export interface Judge0Result {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  status: { id: number; description: string }
  time: string
  memory: number
}

export async function executeCode(
  code: string,
  language: string,
  stdin = ''
): Promise<Judge0Result> {
  const languageId = LANGUAGE_IDS[language.toLowerCase()] || 63

  const submitRes = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_code: code,
      language_id: languageId,
      stdin,
    }),
  })

  if (!submitRes.ok) {
    throw new Error(`Judge0 submission failed: ${submitRes.status}`)
  }

  const { token } = await submitRes.json()

  // Poll for result
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const resultRes = await fetch(
      `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    const result = await resultRes.json()
    if (result.status?.id > 2) {
      return result
    }
  }

  throw new Error('Judge0 execution timed out')
}
