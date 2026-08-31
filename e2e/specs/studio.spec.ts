import { test, expect } from '@playwright/test'
import { openPomasaTab } from './helpers'

test('POMASA Studio opens the workbench', async ({ page }) => {
  await openPomasaTab(page)
  const navHead = page.locator('.ps-nav .ps-nav-title .name')
  await expect(navHead).toBeVisible({ timeout: 15000 })
  await expect(navHead).toHaveText('POMASA Studio')
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
  // stage NAME opens the blueprint modal; select the stage by clicking its count
  await page.locator('.ps-stage').filter({ hasText: 'Research' }).locator('.ps-stage-count').click()
  await expect(page.getByText('Finding Alpha', { exact: true })).toBeVisible({ timeout: 10000 })
  await page.getByText('Finding Alpha', { exact: true }).click() // opens the artifact modal
  await expect(page.getByText('Alpha 的内容')).toBeVisible({ timeout: 10000 })
  await page.getByRole('button', { name: '✕' }).click() // close the modal before picking the next artifact
  await page.getByText('Finding Beta', { exact: true }).click()
  await expect(page.locator('strong', { hasText: '加粗' })).toBeVisible({ timeout: 10000 })
})

test('switching multi-unit MAS to single-unit MAS resets the detail view', async ({ page }) => {
  await openPomasaTab(page)
  // open the multi-unit fixture first: the units card shows its country units
  await page.getByText('全球南方AI战略国别研究', { exact: true }).first().click()
  await expect(page.locator('.ps-unit-row').first()).toBeVisible({ timeout: 15000 })
  // then switch to the single-unit fixture
  await page.getByText('《黑神话·钟馗》市场调研', { exact: true }).first().click()
  // single MAS: stage strip renders its own stages, and no units card leaks in
  await expect(page.locator('.ps-stage').filter({ hasText: '初始扫描' })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.ps-unit-row')).toHaveCount(0)
})
