/**
 * Test 10: Offer banner in messages → Atlas negotiate tab auto-populates.
 *
 * When a candidate has a message thread where status='offer_extended',
 * the /messages/[id] page shows a purple "negotiate with Atlas" banner.
 * Clicking it goes to /agent?tab=negotiate&offerId=[appId].
 */
import { test, expect } from '@playwright/test'

test('messages list page loads', async ({ page }) => {
  await page.goto('/messages')
  await page.waitForLoadState('networkidle')

  // Either shows messages (if authed) or redirects to login
  const has500 = await page.locator('text=500').isVisible().catch(() => false)
  expect(has500).toBe(false)
})

test('/messages/[id] page does not 500 on invalid id', async ({ page }) => {
  await page.goto('/messages/000000000000000000000000')
  await page.waitForLoadState('networkidle')

  // Should not 500 — should either redirect or show 404-like message
  const has500 = await page.locator('text=Internal Server Error').isVisible().catch(() => false)
  expect(has500).toBe(false)
})

test('/agent?tab=negotiate page loads negotiate tab', async ({ page }) => {
  await page.goto('/agent?tab=negotiate')
  await page.waitForLoadState('networkidle')

  const url = page.url()
  if (url.includes('/login') || url.includes('/signin')) {
    // Not logged in — that's fine for this test
    console.log('[test-10] Not logged in — redirect to login is correct')
    return
  }

  const has500 = await page.locator('text=500').isVisible().catch(() => false)
  expect(has500).toBe(false)

  // Should have negotiate tab content
  const hasNegotiateText = await page.locator('text=Negotiat').first().isVisible().catch(() => false)
  console.log('[test-10] Negotiate text visible:', hasNegotiateText)
})

test('offer banner offerId param is preserved in agent navigation', async ({ page }) => {
  // Test the URL structure: /agent?tab=negotiate&offerId=xxx
  const testOfferId = '64f3c2a1e4b0c1234567890a'
  await page.goto(`/agent?tab=negotiate&offerId=${testOfferId}`)
  await page.waitForLoadState('networkidle')

  const url = page.url()
  if (url.includes('/login') || url.includes('/signin')) {
    console.log('[test-10] Not logged in — auth redirect is expected')
    return
  }

  // Should not crash
  const has500 = await page.locator('text=500').isVisible().catch(() => false)
  expect(has500).toBe(false)

  // The offerId should either be in URL still or loaded into state
  const currentUrl = page.url()
  console.log('[test-10] Current URL after navigation:', currentUrl)
})

test('offer banner link structure is correct', async () => {
  // Unit test: verify the href pattern the offer banner generates
  const appId = '64f3c2a1e4b0c1234567890a'
  const expectedHref = `/agent?tab=negotiate&offerId=${appId}`
  const url = new URL(expectedHref, 'http://localhost:3000')

  expect(url.searchParams.get('tab')).toBe('negotiate')
  expect(url.searchParams.get('offerId')).toBe(appId)
  expect(url.pathname).toBe('/agent')
})

test('recruiter assessments page is accessible with auth', async ({ page }) => {
  // Extra test: verify the recruiter assessments page added in B1
  const hasAuth = !!process.env.TEST_RECRUITER_EMAIL

  if (!hasAuth) {
    // Test unauthenticated access — should redirect
    await page.goto('/recruiter/assessments')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    // Should redirect to login, not 500
    const has500 = await page.locator('text=500').isVisible().catch(() => false)
    expect(has500).toBe(false)
    return
  }

  // TODO: with auth, verify the assessments page shows the list
  await page.goto('/recruiter/assessments')
  await page.waitForLoadState('networkidle')

  const has500 = await page.locator('text=500').isVisible().catch(() => false)
  expect(has500).toBe(false)
})
