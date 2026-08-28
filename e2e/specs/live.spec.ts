import { test, expect } from '@playwright/test'
import { openPomasaTab } from './helpers'

// Live generation needs the real LLM provider's API key in the environment.
test.describe('live generation', () => {
  test.skip(!process.env.MAKU_BAILIAN_API_KEY, 'requires MAKU_BAILIAN_API_KEY in env (real LLM provider)')

  test('create a MAS live: form -> generating status visible -> detail on completion', async ({ page }) => {
    test.setTimeout(900_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })

    await openPomasaTab(page)
    await page.getByText('新建 MAS', { exact: true }).first().click()
    await page.getByPlaceholder('e.g. llm_south').fill('e2e_live_research')
    await page.locator('textarea[placeholder="必填"]').fill('端到端测试：开源大模型在全球南方的数字主权影响')
    await page.getByText('生成 MAS', { exact: true }).first().click()

    await expect(page.getByText('生成中', { exact: true }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.ps-caption', { hasText: 'generation.status = generating' })).toBeVisible({ timeout: 10000 })

    await expect(page.getByText('Overview', { exact: true }).first()).toBeVisible({ timeout: 840_000 })
    console.log('LIVE_GENERATION_OK errors:', JSON.stringify(errors.slice(0, 5)))
  })
})
