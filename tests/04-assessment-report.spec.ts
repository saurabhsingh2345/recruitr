/**
 * Test 4 + 5: Assessment report shows composite score + verdict.
 * Recruiter verdict dashboard shows candidates with scores.
 */
import { test, expect } from '@playwright/test'
import { readState, loginRecruiter } from './helpers'

test.describe.configure({ mode: 'serial' })

test('GET /api/assess/[token]/report returns invite with rounds and scores', async ({ request }) => {
  const { inviteToken } = readState()
  if (!inviteToken) {
    test.skip(true, 'No invite token — run earlier tests first')
    return
  }

  const res = await request.get(`/api/assess/${inviteToken}/report`)
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(body.invite).toBeDefined()
  expect(body.assessment).toBeDefined()

  // Verdict is null until all rounds complete — or set if all done
  const { invite } = body
  console.log('[test-04] Invite status:', invite.status, 'Verdict:', invite.verdict)

  if (invite.status === 'completed') {
    expect(invite.verdict).toBeTruthy()
    expect(['strong_hire', 'hire', 'maybe', 'no_hire']).toContain(invite.verdict)
    expect(invite.compositeScore).toBeGreaterThanOrEqual(0)
    expect(invite.compositeScore).toBeLessThanOrEqual(100)
  }
})

test('report page renders at /assess/[token]/report', async ({ page }) => {
  const { inviteToken } = readState()
  if (!inviteToken) {
    test.skip(true, 'No invite token')
    return
  }

  await page.goto(`/assess/${inviteToken}/report`)
  await page.waitForLoadState('networkidle')

  // Page should not show an error
  const hasError = await page.locator('text=Link not valid').isVisible().catch(() => false)
  expect(hasError).toBe(false)

  // Should show either a loading spinner or content
  const hasContent = await page.locator('h1, h2').first().isVisible().catch(() => false)
  const hasSpinner = await page.locator('.animate-spin').isVisible().catch(() => false)
  expect(hasContent || hasSpinner).toBe(true)
})

test('composite score formula: average of completed round scores', async ({ request }) => {
  const { inviteToken } = readState()
  if (!inviteToken) {
    test.skip(true, 'No invite token')
    return
  }

  const res = await request.get(`/api/assess/${inviteToken}/report`)
  const body = await res.json()
  const { invite } = body

  const completedRounds = invite.rounds.filter(
    (r: { status: string; score?: number }) => r.status === 'completed' && typeof r.score === 'number'
  )

  if (completedRounds.length === 0) {
    console.log('[test-04] No completed rounds yet — skipping composite check')
    return
  }

  const expectedComposite = Math.round(
    completedRounds.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / completedRounds.length
  )
  // compositeScore should be close to the average (within 1 due to rounding)
  expect(Math.abs(invite.compositeScore - expectedComposite)).toBeLessThanOrEqual(1)
})

test('recruiter sees assessment detail with invite data', async ({ request }) => {
  const hasAuth = await loginRecruiter(request)
  const { assessmentId } = readState()

  if (!hasAuth || !assessmentId) {
    test.skip(true, 'Recruiter auth or assessmentId not available')
    return
  }

  const res = await request.get(`/api/recruiter/assessments/${assessmentId}`)
  expect(res.status()).toBe(200)

  const body = await res.json()
  expect(body.assessment).toBeDefined()
  expect(body.invites).toBeDefined()
  expect(Array.isArray(body.invites)).toBe(true)

  if (body.invites.length > 0) {
    const invite = body.invites[0]
    expect(invite.candidateEmail).toBeTruthy()
    // Each invite's rounds should have sessionReport attached if completed
    const completedRounds = invite.rounds.filter((r: { status: string }) => r.status === 'completed')
    for (const round of completedRounds) {
      expect(round.sessionReport).toBeDefined()
      expect(round.sessionReport.scores).toBeDefined()
    }
  }
})

test('verdict thresholds match spec: ≥80=strong_hire, ≥65=hire, ≥50=maybe, <50=no_hire', async ({ request }) => {
  // This tests the computeVerdict function indirectly
  // We verify the verdict makes sense for the composite score we observed
  const { inviteToken } = readState()
  if (!inviteToken) {
    test.skip(true, 'No token')
    return
  }

  const res = await request.get(`/api/assess/${inviteToken}/report`)
  const body = await res.json()
  const { invite } = body

  if (invite.status !== 'completed' || invite.verdict === null) {
    console.log('[test-04] Not yet completed — skipping verdict threshold check')
    return
  }

  const { compositeScore, verdict } = invite
  if (compositeScore >= 80) expect(verdict).toBe('strong_hire')
  else if (compositeScore >= 65) expect(verdict).toBe('hire')
  else if (compositeScore >= 50) expect(verdict).toBe('maybe')
  else expect(verdict).toBe('no_hire')
})
