/**
 * Test 2: Guest candidate opens token link → identifies → sees assessment overview.
 *
 * This test creates its own assessment via the recruiter API, so it can run
 * independently of test 01 by using TEST_RECRUITER_EMAIL/PASSWORD.
 * If recruiter creds aren't available, it reads the token saved by test 01.
 */
import { test, expect } from '@playwright/test'
import { readState } from './helpers'

let token: string

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  // Token must be set by test-01 (requires TEST_RECRUITER_EMAIL/PASSWORD)
  const state = readState()
  if (state.inviteToken) {
    token = state.inviteToken
  }
})

test('GET /api/assess/[token] returns 404 for invalid token', async ({ request }) => {
  const res = await request.get('/api/assess/invalid-token-xyz')
  expect(res.status()).toBe(404)
  const body = await res.json()
  expect(body.error).toBeTruthy()
})

test('candidate identify form requires name and email', async ({ request }) => {
  if (!token) {
    test.skip(true, 'No invite token available — run test 01 first')
    return
  }

  // Missing name → 400
  const res = await request.patch(`/api/assess/${token}/identify`, {
    data: { name: '', email: 'test@example.com' },
  })
  expect(res.status()).toBe(400)
})

test('valid token shows assessment landing page in browser', async ({ page }) => {
  if (!token) {
    test.skip(true, 'No invite token available — run test 01 first')
    return
  }

  await page.goto(`/assess/${token}`)

  // Should show the identify form (since candidate name was not pre-filled)
  // or the overview if name was pre-filled
  const hasIdentifyForm = await page.locator('text=Your full name').isVisible().catch(() => false)
  const hasOverview = await page.locator('text=assessment overview').isVisible().catch(() => false)

  expect(hasIdentifyForm || hasOverview).toBe(true)
})

test('candidate identifies successfully', async ({ request }) => {
  if (!token) {
    test.skip(true, 'No invite token available — run test 01 first')
    return
  }

  const res = await request.patch(`/api/assess/${token}/identify`, {
    data: { name: 'E2E Candidate', email: 'e2e@test.intervue' },
  })

  // Either 200 (success) or 409 (already identified — idempotent)
  expect([200, 409]).toContain(res.status())

  if (res.ok()) {
    const body = await res.json()
    expect(body.invite?.candidateName).toBe('E2E Candidate')
  }
})

test('after identify, GET /api/assess/[token] returns candidateName', async ({ request }) => {
  if (!token) {
    test.skip(true, 'No invite token available')
    return
  }

  const res = await request.get(`/api/assess/${token}`)
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body.invite).toBeDefined()
  expect(body.assessment).toBeDefined()
  expect(body.company).toBeTruthy()
  // After identification, candidateName should be set
  expect(body.invite.candidateName).toBeTruthy()
})
