/**
 * Test 1: Recruiter creates an assessment and candidates receive invite tokens.
 * Requires TEST_RECRUITER_EMAIL + TEST_RECRUITER_PASSWORD in env.
 */
import { test, expect } from '@playwright/test'
import { loginRecruiter, mergeState, futureDeadline } from './helpers'

test.describe.configure({ mode: 'serial' })

test('recruiter creates assessment via API and gets invite tokens', async ({ request }) => {
  const hasAuth = await loginRecruiter(request)
  if (!hasAuth) {
    test.skip(true, 'TEST_RECRUITER_EMAIL/PASSWORD not set — skipping recruiter tests')
    return
  }

  const payload = {
    title: 'Backend Engineer Assessment [E2E Test]',
    role: 'Backend Engineer',
    deadline: futureDeadline(30),
    rounds: [
      { order: 1, format: 'coding', title: 'Coding Round', durationMinutes: 30 },
      { order: 2, format: 'behavioural', title: 'Behavioural Round', durationMinutes: 20 },
    ],
    candidates: [
      { name: 'E2E Candidate', email: 'e2e-candidate@test.intervue' },
    ],
  }

  const res = await request.post('/api/recruiter/assessments', {
    data: payload,
  })

  expect(res.status()).toBe(200)
  const body = await res.json()

  expect(body.assessment).toBeDefined()
  expect(body.assessment._id).toBeTruthy()
  expect(body.assessment.title).toBe(payload.title)
  expect(body.inviteCount).toBe(1)

  const assessmentId = body.assessment._id
  mergeState({ assessmentId })
  console.log('[test-01] Created assessment:', assessmentId)

  // Fetch the detail to get the invite token
  const detailRes = await request.get(`/api/recruiter/assessments/${assessmentId}`)
  if (detailRes.ok()) {
    const detail = await detailRes.json()
    const firstInvite = detail.invites?.[0]
    if (firstInvite?.token) {
      mergeState({ inviteToken: firstInvite.token })
      console.log('[test-01] Saved invite token:', firstInvite.token)
    }
  }
})

test('recruiter assessment list includes new assessment', async ({ request }) => {
  const hasAuth = await loginRecruiter(request)
  if (!hasAuth) {
    test.skip(true, 'TEST_RECRUITER_EMAIL/PASSWORD not set')
    return
  }

  const res = await request.get('/api/recruiter/assessments')
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(Array.isArray(body.assessments)).toBe(true)
  expect(body.assessments.length).toBeGreaterThan(0)

  const { assessmentId } = (await import('./helpers')).readState()
  if (assessmentId) {
    const found = body.assessments.find((a: { _id: string }) => a._id === assessmentId)
    expect(found).toBeDefined()
    expect(found.title).toBe('Backend Engineer Assessment [E2E Test]')
  }
})
