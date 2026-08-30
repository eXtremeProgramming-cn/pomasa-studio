import { test, expect } from '@playwright/test'
import { openPomasaTab } from './helpers'

// The black-myth-zhong-kui fixture is a verbatim copy of a REAL generated MAS
// (real generator descriptor shape: bare .md agent names plus a prose
// orchestrator stage). It is the reference fixture for studio display work —
// keep asserting the real-shape render here so future UI changes can't regress it.
test('fixture MAS: real generator shape lists and opens in the workbench', async ({ page }) => {
  await openPomasaTab(page)
  const row = page.getByText('《黑神话·钟馗》市场调研', { exact: true }).first()
  await expect(row).toBeVisible({ timeout: 15000 })
  await row.click()
  // detail info bar uses the descriptor name, not the registry name
  await expect(page.getByText('《黑神话·钟馗》特点与预期销量研究', { exact: true })).toBeVisible({ timeout: 15000 })
  // a real 8-stage system; the prose-orchestrator "报告装配与交付" stage renders
  await expect(page.locator('.ps-stage').filter({ hasText: '初始扫描' })).toBeVisible()
  await expect(page.locator('.ps-stage').filter({ hasText: '报告装配与交付' })).toBeVisible()
  await expect(page.getByRole('button', { name: '运行' })).toBeVisible()
})

test('language switch: the nav-footer toggle flips the Studio chrome between zh and en', async ({ page }) => {
  await openPomasaTab(page)
  // default language is zh
  await expect(page.getByRole('button', { name: '新建 MAS' })).toBeVisible({ timeout: 15000 })
  // switch to English from the footer of the left nav
  await page.locator('.ps-nav-foot .ps-lang-opt', { hasText: 'English' }).click()
  await expect(page.getByRole('button', { name: 'New MAS' })).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('button', { name: '新建 MAS' })).toHaveCount(0)
  // MAS data keeps its own language — the fixture system name is content, not chrome
  await expect(page.getByText('《黑神话·钟馗》市场调研', { exact: true }).first()).toBeVisible()
  // and back to zh
  await page.locator('.ps-nav-foot .ps-lang-opt', { hasText: '中文' }).click()
  await expect(page.getByRole('button', { name: '新建 MAS' })).toBeVisible({ timeout: 5000 })
})