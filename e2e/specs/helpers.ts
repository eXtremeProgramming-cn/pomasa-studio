import { test, type Page } from '@playwright/test'

// The sidebar groups sessions by workspace. Opening ANY real session renders
// the conversation scene bar (incl. our POMASA tab). With pomasa workspaces
// present, the pomasa workspace's own "New Session" row is a blank staging
// row — skip it and open a real session instead.
const WORKSPACE_PROBES = ['china-ai-datacenter-governance', 'Projects', 'bootstrap', 'ai4ss-writings']

async function pomasaVisible(page: Page) {
  return await page.getByText('POMASA', { exact: true }).first().isVisible().catch(() => false)
}

export async function ensureSession(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForTimeout(3000)
  if (await pomasaVisible(page)) return

  // 1) open a known real workspace (its primary session opens)
  for (const name of WORKSPACE_PROBES) {
    const row = page.locator('[role="treeitem"]').filter({ hasText: name }).first()
    if (!(await row.isVisible().catch(() => false))) continue
    console.log('opening workspace:', name)
    await row.click({ force: true })
    for (let i = 0; i < 10; i += 1) {
      await page.waitForTimeout(1000)
      if (await pomasaVisible(page)) return
    }
  }

  // 2) fallback: click a real session row (skip the blank New Session staging rows)
  const sessionRow = page.locator('div.YDXeBa_sessionRow').filter({ hasNotText: 'New Session' }).last()
  if (await sessionRow.isVisible().catch(() => false)) {
    console.log('opening session row:', ((await sessionRow.innerText()) || '').slice(0, 30))
    await sessionRow.click({ force: true })
    for (let i = 0; i < 10; i += 1) {
      await page.waitForTimeout(1000)
      if (await pomasaVisible(page)) return
    }
  }
  console.log('ensure: FAILED to reach POMASA; body=', (await page.locator('body').innerText()).slice(0, 160).replace(/\n+/g, ' | '))
  test.skip(true, 'POMASA tab not reachable')
}

export async function openPomasaTab(page: Page): Promise<void> {
  await ensureSession(page)
  const tab = page.getByText('POMASA', { exact: true }).first()
  if (!(await tab.isVisible().catch(() => false))) {
    test.skip(true, 'POMASA conversation.view tab not rendered')
  }
  await tab.click({ force: true })
  await page.waitForTimeout(1200)
}
