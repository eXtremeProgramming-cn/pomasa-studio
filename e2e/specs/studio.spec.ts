import { test, expect } from '@playwright/test'
import { openPomasaTab } from './helpers'

test('POMASA tab opens the Studio list', async ({ page }) => {
  await openPomasaTab(page)
  await expect(page.getByText('POMASA Studio')).toBeVisible({ timeout: 15000 })
})

test('MAS list shows the fixture mas and opens detail', async ({ page }) => {
  await openPomasaTab(page)
  const card = page.getByText('Demo MAS', { exact: true }).first()
  await expect(card).toBeVisible({ timeout: 15000 })
  await card.click()
  await expect(page.getByText('Overview', { exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('Research', { exact: true })).toBeVisible()
  await expect(page.getByText('Report', { exact: true })).toBeVisible()
})

test('stage artifacts render and viewer opens markdown', async ({ page }) => {
  await openPomasaTab(page)
  await page.getByText('Demo MAS', { exact: true }).first().click()
  await expect(page.getByText('Overview Document', { exact: true })).toBeVisible({ timeout: 15000 })
  await page.getByText('Research', { exact: true }).click()
  await expect(page.getByText('Finding Alpha', { exact: true })).toBeVisible({ timeout: 10000 })
  await page.getByText('Finding Alpha', { exact: true }).click()
  await expect(page.getByText('Alpha 的内容')).toBeVisible({ timeout: 10000 })
  await page.getByText('Finding Beta', { exact: true }).click()
  await expect(page.locator('strong', { hasText: '加粗' })).toBeVisible({ timeout: 10000 })
})
