import { test, expect, type Page } from '@playwright/test'

// L4a browser E2E against a hermetic dsh web seeded with the fixture MAS.
// First live run will need selector calibration against the installed dsh web DOM.
// The conversation.view tab only renders inside an open session.

async function openSession(page: Page) {
  await page.goto('/')
  // A chat composer (textarea) means a session view is attached.
  const composer = page.locator('textarea').first()
  try {
    await composer.waitFor({ timeout: 20000 })
  } catch {
    // No auto-created session: try to start one via obvious affordances.
    const newBtn = page.getByText(/new session|新建|新对话/i).first()
    await newBtn.click({ timeout: 5000 }).catch(() => {})
    await composer.waitFor({ timeout: 20000 })
  }
  return composer
}

test('POMASA tab sits beside Chat / Trajectory', async ({ page }) => {
  await openSession(page)
  const tab = page.getByRole('button', { name: 'POMASA' }).first()
  await expect(tab).toBeVisible({ timeout: 20000 })
  await tab.click()
})

test('MAS list shows the fixture mas', async ({ page }) => {
  await openSession(page)
  await page.getByRole('button', { name: 'POMASA' }).first().click()
  await expect(page.getByText('POMASA Studio')).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Demo MAS')).toBeVisible({ timeout: 10000 })
})

test('detail renders stage strip and artifacts; viewer opens content', async ({ page }) => {
  await openSession(page)
  await page.getByRole('button', { name: 'POMASA' }).first().click()
  await expect(page.getByText('Demo MAS')).toBeVisible({ timeout: 20000 })
  await page.getByText('Demo MAS').first().click()

  await expect(page.getByText('Overview')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Research')).toBeVisible()
  await expect(page.getByText('Report')).toBeVisible()

  // Overview stage selected by default: one artifact card
  await expect(page.getByText('Overview Document')).toBeVisible({ timeout: 10000 })

  // Switch to the Research stage and open an artifact
  await page.getByText('Research').click()
  await expect(page.getByText('Finding Alpha')).toBeVisible({ timeout: 10000 })
  await page.getByText('Finding Alpha').click()
  await expect(page.locator('text=Alpha 的内容')).toBeVisible({ timeout: 10000 })

  // Markdown rendering of bold/code/link in the other artifact
  await page.getByText('Finding Beta').click()
  await expect(page.locator('strong', { hasText: '加粗' })).toBeVisible({ timeout: 10000 })
  await expect(page.locator('a[href="https://example.com"]')).toBeVisible()
})

test('completed run shows stage statuses from run.json', async ({ page }) => {
  await openSession(page)
  await page.getByRole('button', { name: 'POMASA' }).first().click()
  await page.getByText('Demo MAS').first().click()
  await expect(page.getByText('运行信息')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/completed|完成/)).toBeVisible({ timeout: 10000 })
})