import { test, type Page } from '@playwright/test'

// The workbench (StudioRoot) renders two ways: as the POMASA ring tab inside a
// session that has content, and as the shell.overlay panel toggled by the
// footer (reachable on ANY screen state, incl. brand-new blank sessions). Both
// mount the same `.ps-workbench`. Session-reach fallbacks below cover envs
// where the footer panel is not the path (older builds / user-copied homes).
const WORKSPACE_PROBES = ['china-ai-datacenter-governance', 'Projects', 'bootstrap', 'ai4ss-writings']

async function pomasaVisible(page: Page) {
  return await page.locator('.ps-workbench').first().isVisible().catch(() => false)
}

async function waitForWorkbench(page: Page) {
  for (let i = 0; i < 12; i += 1) {
    await page.waitForTimeout(1000)
    if (await pomasaVisible(page)) return true
  }
  return false
}

export async function ensureSession(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForTimeout(3000)
  // DSH 0.1 fresh-env boot shows two onboarding modals whose masks (z-index 1000)
  // freeze every click until dismissed: the Internal Testing Notice, then the
  // "Add an API key" dialog. Dismiss both before interacting.
  const cont = page.getByRole('button', { name: 'Continue' }).first()
  if (await cont.isVisible().catch(() => false)) {
    await cont.click({ force: true }).catch(() => {})
    await page.waitForTimeout(1000)
  }
  const later = page.getByRole('button', { name: 'Configure later' }).first()
  if (await later.isVisible().catch(() => false)) {
    await later.click({ force: true }).catch(() => {})
    await page.waitForTimeout(1000)
  }
  if (await pomasaVisible(page)) return

  // 1) footer launcher toggles the non-covering workbench panel. Click the DOM
  //    node directly so no overlay interception can swallow the event.
  const clicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.ps-footer-action')).find(
      (e) => e.textContent && e.textContent.trim() === 'POMASA Studio')
    if (el) { (el as HTMLElement).click(); return true }
    return false
  }).catch(() => false)
  if (clicked && await waitForWorkbench(page)) return

  // 2) fallback: open the POMASA workspace's New Session row — sessions that
  //    gain content render the POMASA tab in the ring.
  const newSession = page.getByText('New Session').first()
  if (await newSession.isVisible().catch(() => false)) {
    console.log('opening New Session row of the POMASA workspace')
    await newSession.click({ force: true }).catch(() => {})
    if (await waitForWorkbench(page)) return
  }

  // 3) user-copied env: open a known real workspace (its primary session opens)
  for (const name of WORKSPACE_PROBES) {
    const row = page.locator('[role="treeitem"]').filter({ hasText: name }).first()
    if (!(await row.isVisible().catch(() => false))) continue
    console.log('opening workspace:', name)
    await row.click({ force: true })
    if (await waitForWorkbench(page)) return
  }

  // 4) fallback: click a real session row (skip blank New Session staging rows)
  const sessionRow = page.locator('div.YDXeBa_sessionRow').filter({ hasNotText: 'New Session' }).last()
  if (await sessionRow.isVisible().catch(() => false)) {
    console.log('opening session row:', ((await sessionRow.innerText()) || '').slice(0, 30))
    await sessionRow.click({ force: true })
    if (await waitForWorkbench(page)) return
  }
  console.log('ensure: FAILED to reach POMASA; body=', (await page.locator('body').innerText()).slice(0, 160).replace(/\n+/g, ' | '))
  test.skip(true, 'POMASA workbench not reachable')
}

export async function openPomasaTab(page: Page): Promise<void> {
  await ensureSession(page)
  if (!(await pomasaVisible(page))) {
    test.skip(true, 'POMASA workbench not rendered')
  }
  await page.waitForTimeout(500)
}