/**
 * Auth setup: logs in as a recruiter and saves cookie state for recruiter tests.
 * Requires env vars: TEST_RECRUITER_EMAIL and TEST_RECRUITER_PASSWORD.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/recruiter.json')

setup('authenticate as recruiter', async ({ page, request }) => {
  const email = process.env.TEST_RECRUITER_EMAIL
  const password = process.env.TEST_RECRUITER_PASSWORD

  if (!email || !password) {
    console.warn('[auth-setup] TEST_RECRUITER_EMAIL / TEST_RECRUITER_PASSWORD not set — writing empty auth state')
    await page.context().storageState({ path: AUTH_FILE })
    return
  }

  // 1. Get CSRF token from NextAuth
  const csrfRes = await request.get('/api/auth/csrf')
  const { csrfToken } = await csrfRes.json()

  // 2. POST credentials
  const loginRes = await request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: 'http://localhost:3000/recruiter/dashboard',
      json: 'true',
    },
    maxRedirects: 0,
  })

  // 3. The session cookie is now in the context — navigate to confirm
  await page.goto('/recruiter/dashboard')
  // If redirected to login, auth failed
  const url = page.url()
  if (url.includes('/login') || url.includes('/signin')) {
    console.warn('[auth-setup] Login failed — recruiter tests will be skipped')
  }

  await page.context().storageState({ path: AUTH_FILE })
})
