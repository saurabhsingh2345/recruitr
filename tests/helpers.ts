import { APIRequestContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

export const STATE_FILE = path.join(__dirname, '.state.json')

export interface TestState {
  assessmentId?: string
  inviteToken?: string
  sessionId?: string
  candidateToken?: string
}

export function readState(): TestState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

export function writeState(state: TestState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

export function mergeState(updates: Partial<TestState>) {
  writeState({ ...readState(), ...updates })
}

/** Log in via credentials and return a request context with session cookies. */
export async function loginRecruiter(request: APIRequestContext): Promise<boolean> {
  const email = process.env.TEST_RECRUITER_EMAIL
  const password = process.env.TEST_RECRUITER_PASSWORD
  if (!email || !password) return false

  const csrfRes = await request.get('/api/auth/csrf')
  if (!csrfRes.ok()) return false
  const { csrfToken } = await csrfRes.json()

  await request.post('/api/auth/callback/credentials', {
    form: { csrfToken, email, password, callbackUrl: 'http://localhost:3000', json: 'true' },
    maxRedirects: 0,
  })
  return true
}

/** Future deadline for test assessments */
export function futureDeadline(daysFromNow = 30): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}
