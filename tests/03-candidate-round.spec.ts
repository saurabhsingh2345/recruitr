/**
 * Test 3: Guest candidate starts a round → responds → completes.
 * Requires a valid invite token in shared state (from test 01/02).
 * Makes real LLM calls — requires GROQ_API_KEY in the server environment.
 */
import { test, expect } from '@playwright/test'
import { readState, mergeState } from './helpers'

test.describe.configure({ mode: 'serial' })

test('start round 1 returns a sessionId and opening message', async ({ request }) => {
  const { inviteToken } = readState()
  if (!inviteToken) {
    test.skip(true, 'No invite token in state — ensure test 01 ran first')
    return
  }

  const res = await request.post(`/api/assess/${inviteToken}/round/1/start`)

  expect(res.status()).toBe(200)
  const body = await res.json()

  expect(body.sessionId).toBeTruthy()
  expect(typeof body.openingMessage).toBe('string')
  expect(body.openingMessage.length).toBeGreaterThan(10)
  expect(body.format).toBeTruthy()

  mergeState({ sessionId: body.sessionId })
  console.log('[test-03] Round started, sessionId:', body.sessionId)
})

test('starting the same round again is idempotent', async ({ request }) => {
  const { inviteToken, sessionId } = readState()
  if (!inviteToken || !sessionId) {
    test.skip(true, 'Missing state — run previous tests first')
    return
  }

  const res = await request.post(`/api/assess/${inviteToken}/round/1/start`)
  expect(res.status()).toBe(200)
  const body = await res.json()

  // Should return the SAME sessionId (idempotent)
  expect(body.sessionId.toString()).toBe(sessionId.toString())
})

test('candidate can send a message to the round', async ({ request }) => {
  const { inviteToken, sessionId } = readState()
  if (!inviteToken || !sessionId) {
    test.skip(true, 'Missing state')
    return
  }

  const res = await request.post(`/api/assess/${inviteToken}/round/1/respond`, {
    data: {
      sessionId,
      message: 'I would use a hash map to solve this in O(n) time complexity.',
    },
  })

  // Streaming response — expect 200 with text/event-stream or text/plain
  expect(res.status()).toBe(200)
  const text = await res.text()
  expect(text.length).toBeGreaterThan(5)
})

test('round page renders correctly in browser', async ({ page }) => {
  const { inviteToken } = readState()
  if (!inviteToken) {
    test.skip(true, 'No invite token in state')
    return
  }

  await page.goto(`/assess/${inviteToken}/round/1`)

  // Should show the interview interface with a chat area
  await page.waitForLoadState('networkidle')
  const hasChat = await page.locator('textarea, [data-testid="message-input"]').isVisible().catch(() => false)
  const hasLoader = await page.locator('.animate-spin').isVisible().catch(() => false)

  // Either loading state or chat is visible
  expect(hasChat || hasLoader).toBe(true)
})

test('completing the round records score and updates invite', async ({ request }) => {
  const { inviteToken, sessionId } = readState()
  if (!inviteToken || !sessionId) {
    test.skip(true, 'Missing state')
    return
  }

  const res = await request.patch(`/api/assess/${inviteToken}/round/1/complete`, {
    data: { sessionId },
  })

  expect(res.status()).toBe(200)
  const body = await res.json()

  expect(typeof body.overallScore).toBe('number')
  expect(body.overallScore).toBeGreaterThanOrEqual(0)
  expect(body.overallScore).toBeLessThanOrEqual(100)
  expect(body.invite).toBeDefined()

  // Find round 1 in the returned invite
  const round1 = body.invite.rounds.find((r: { roundOrder: number }) => r.roundOrder === 1)
  expect(round1).toBeDefined()
  expect(round1.status).toBe('completed')
  expect(typeof round1.score).toBe('number')

  console.log('[test-03] Round 1 score:', body.overallScore)
})
