import { test, expect } from '@playwright/test'
import { openPomasaTab } from './helpers'

// L4a browser E2E against the hermetic dsh web seeded with the fixture MAS.
// NOTE: the conversation scene tabs (对话/轨迹/POMASA) render only in the real
// desktop shell — the headless web boot does not surface them (see helpers.ts).
// When they do render, these specs drive the fixture data (no model calls).
test('POMASA tab sits near the conversation area', async ({ page }) => {
  await openPomasaTab(page)
  await expect(page.getByText('POMASA Studio')).toBeVisible({ timeout: 20000 })
})

test('MAS list shows the fixture mas', async ({ page }) => {
  await openPomasaTab(page)
  await expect(page.getByText('Demo MAS')).toBeVisible({ timeout: 20000 })
})

test('detail renders stage strip; viewer opens artifact content', async ({ page }) => {
  await openPomasaTab(page)
  await page.getByText('Demo MAS').first().click()

  await expect(page.getByText('Overview')).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Research')).toBeVisible()
  await expect(page.getByText('Report')).toBeVisible()
  await expect(page.getByText('Overview Document')).toBeVisible({ timeout: 10000 })

  await page.getByText('Research').click()
  await expect(page.getByText('Finding Alpha')).toBeVisible({ timeout: 10000 })
  await page.getByText('Finding Alpha').click()
  await expect(page.getByText('Alpha 的内容')).toBeVisible({ timeout: 10000 })

  await page.getByText('Finding Beta').click()
  await expect(page.locator('strong', { hasText: '加粗' })).toBeVisible({ timeout: 10000 })
  await expect(page.locator('a[href="https://example.com"]')).toBeVisible()
})