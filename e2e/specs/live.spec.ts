import { test, expect } from '@playwright/test'
import { openPomasaTab } from './helpers'

// Generation is MOCKED in the E2E environment (POMASA_TEST_FAST_GENERATION=1,
// set by servers.mjs) — no real LLM call, completes in seconds. This verifies
// the full flow: 生成中 live status -> generation transcript streams -> detail
// opens on completion. The real-LLM path is covered by the standalone pomasa
// generation test and a manual desktop check.
test.describe('generation flow (mocked model)', () => {
  test('create MAS: live status + streaming generation log + detail on completion', async ({ page }) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })

    await openPomasaTab(page)
    await page.getByText('新建 MAS', { exact: true }).first().click()
    await page.getByPlaceholder('e.g. llm_south').fill('e2e_mock_gen')
    await page.locator('textarea[placeholder="必填"]').fill('端到端测试（mock 模型）：开源大模型的数字主权影响')
    await page.getByText('生成 MAS', { exact: true }).first().click()

    // live generating status (not a static spinner)
    await expect(page.getByText('生成中', { exact: true }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.ps-caption', { hasText: 'generation.status = generating' })).toBeVisible({ timeout: 10000 })

    // generation transcript streams in the collapsible log panel
    await page.getByText('生成会话（消息 / 工具调用 / 思考过程）', { exact: false }).click()
    await expect(page.locator('.ps-log-body')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/开始生成 MAS/, { exact: false })).toBeVisible({ timeout: 10000 })

    // mock generation finishes -> detail with stage strip appears
    await expect(page.getByText('Overview', { exact: true }).first()).toBeVisible({ timeout: 60_000 })
    console.log('MOCK_GENERATION_FLOW_OK errors:', JSON.stringify(errors.slice(0, 5)))
  })
})
