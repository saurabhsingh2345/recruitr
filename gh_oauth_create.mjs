import { chromium } from 'playwright'
import path from 'path'
import os from 'os'
import fs from 'fs'

const CHROME_PROFILE = path.join(os.homedir(), 'Library/Application Support/Google/Chrome')
const TEMP_PROFILE = '/tmp/chrome-intervue-profile'

// Copy Chrome profile to temp dir to avoid lock conflict
function copyProfile() {
  if (fs.existsSync(TEMP_PROFILE)) {
    fs.rmSync(TEMP_PROFILE, { recursive: true })
  }
  fs.mkdirSync(TEMP_PROFILE, { recursive: true })

  // Copy only Default profile (cookies, local storage)
  const defaultSrc = path.join(CHROME_PROFILE, 'Default')
  const defaultDst = path.join(TEMP_PROFILE, 'Default')
  fs.cpSync(defaultSrc, defaultDst, { recursive: true })

  // Copy Local State (needed for Chrome to start)
  const localStateSrc = path.join(CHROME_PROFILE, 'Local State')
  if (fs.existsSync(localStateSrc)) {
    fs.copyFileSync(localStateSrc, path.join(TEMP_PROFILE, 'Local State'))
  }
}

async function main() {
  console.log('Copying Chrome profile...')
  copyProfile()

  console.log('Launching browser...')
  const context = await chromium.launchPersistentContext(TEMP_PROFILE, {
    headless: false,
    channel: 'chrome',
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
  })

  const page = await context.newPage()

  console.log('Navigating to GitHub OAuth app creation...')
  await page.goto('https://github.com/settings/applications/new', { waitUntil: 'networkidle' })

  // Check if we're on the right page (logged in)
  const title = await page.title()
  console.log('Page title:', title)

  if (title.toLowerCase().includes('sign in')) {
    console.log('ERROR: Not logged in to GitHub in this browser profile')
    await context.close()
    process.exit(1)
  }

  // Fill in the form
  console.log('Filling in form...')
  await page.locator('#oauth_application_name').fill('Intervue Dev')
  await page.locator('#url').fill('http://localhost:3000')
  await page.locator('#callback_url').fill('http://localhost:3000/api/auth/callback/github')

  // Submit
  console.log('Submitting form...')
  await page.locator('[data-disable-with="Register application"]').click()
  await page.waitForLoadState('networkidle')

  // Get Client ID
  const clientIdEl = await page.locator('.oauth-client-id code').first()
  const clientId = await clientIdEl.textContent()
  console.log('CLIENT_ID:', clientId?.trim())

  // Generate client secret
  const genBtn = page.locator('text=Generate a new client secret')
  if (await genBtn.isVisible()) {
    await genBtn.click()
    await page.waitForLoadState('networkidle')
  }

  // Get client secret (it appears after generation)
  await page.waitForSelector('.flash-full-width code, .client-secret-value, [data-secret]', { timeout: 10000 })
  const secretEl = page.locator('.flash-full-width code, .client-secret-value').first()
  const clientSecret = await secretEl.textContent()
  console.log('CLIENT_SECRET:', clientSecret?.trim())

  console.log('\nDONE')
  await context.close()
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
