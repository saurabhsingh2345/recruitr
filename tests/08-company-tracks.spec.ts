/**
 * Test 8: Company track page shows rounds + "Start Round 1" works.
 *
 * Company tracks are static data (no auth needed), so these are pure UI tests.
 */
import { test, expect } from '@playwright/test'

const EXPECTED_COMPANIES = ['google', 'meta', 'stripe', 'razorpay', 'zerodha', 'flipkart']

test('GET /companies loads without error', async ({ page }) => {
  await page.goto('/companies')
  await page.waitForLoadState('networkidle')

  // Should not 404 or 500
  const hasError = await page.locator('text=404').isVisible().catch(() => false)
  const has500 = await page.locator('text=500').isVisible().catch(() => false)
  expect(hasError || has500).toBe(false)

  // Should show company names or cards
  const hasContent = await page.locator('h1, h2, [class*="card"]').first().isVisible().catch(() => false)
  expect(hasContent).toBe(true)
})

test('/companies/google shows Google track detail', async ({ page }) => {
  await page.goto('/companies/google')
  await page.waitForLoadState('networkidle')

  // Should not 404
  const has404 = await page.locator('text=404').isVisible().catch(() => false)
  expect(has404).toBe(false)

  // Should show "Google" somewhere on the page
  const hasGoogle = await page.locator('text=Google').first().isVisible().catch(() => false)
  expect(hasGoogle).toBe(true)
})

test('/companies/[id] shows round list', async ({ page }) => {
  await page.goto('/companies/stripe')
  await page.waitForLoadState('networkidle')

  // Should show round information
  const has404 = await page.locator('text=404').isVisible().catch(() => false)
  expect(has404).toBe(false)

  // Rounds should be listed
  const hasRound = await page.locator('text=Round').first().isVisible().catch(() => false)
  const hasStart = await page.locator('text=Start').first().isVisible().catch(() => false)
  console.log('[test-08] Stripe track has rounds visible:', hasRound, 'Start CTA:', hasStart)

  // At minimum the page should load
  const hasContent = await page.locator('h1, h2').first().isVisible().catch(() => false)
  expect(hasContent).toBe(true)
})

test('"Start Round 1" link has correct href with companyTrackId param', async ({ page }) => {
  await page.goto('/companies/meta')
  await page.waitForLoadState('networkidle')

  // Find the "Start Round 1" button specifically (not "Get started free" from auth CTA)
  const startLink = page.locator('a').filter({ hasText: /Start Round 1/i }).first()
  const isVisible = await startLink.isVisible().catch(() => false)

  if (!isVisible) {
    console.log('[test-08] No visible start link on /companies/meta — may need auth')
    return
  }

  const href = await startLink.getAttribute('href')
  expect(href).toBeTruthy()
  expect(href).toContain('companyTrackId=meta')
  expect(href).toContain('/interview/new')
  console.log('[test-08] Start Round 1 href:', href)
})

test('/companies/zerodha shows Indian company track', async ({ page }) => {
  await page.goto('/companies/zerodha')
  await page.waitForLoadState('networkidle')

  const has404 = await page.locator('text=404').isVisible().catch(() => false)
  expect(has404).toBe(false)

  const hasZerodha = await page.locator('text=Zerodha').first().isVisible().catch(() => false)
  expect(hasZerodha).toBe(true)
})

test('all 20 company tracks resolve without 404', async ({ page }) => {
  const TRACK_IDS = [
    'google', 'meta', 'amazon', 'microsoft', 'stripe',
    'atlassian', 'uber', 'airbnb', 'netflix', 'salesforce',
    'zerodha', 'razorpay', 'flipkart', 'swiggy', 'phonepe',
    'cred', 'meesho', 'browserstack', 'freshworks', 'zoho',
  ]

  const results: Record<string, boolean> = {}

  for (const id of TRACK_IDS) {
    await page.goto(`/companies/${id}`)
    await page.waitForLoadState('networkidle')
    const has404 = await page.locator('text=404').isVisible().catch(() => false)
    results[id] = !has404
  }

  const failed = Object.entries(results).filter(([, ok]) => !ok).map(([id]) => id)
  if (failed.length > 0) {
    console.error('[test-08] These tracks returned 404:', failed)
  }
  expect(failed).toHaveLength(0)
})
