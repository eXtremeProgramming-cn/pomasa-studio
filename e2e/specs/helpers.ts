import { test, type Page } from '@playwright/test'

// Proven navigation through dsh web onboarding (verified against the
// desktop-copy hermetic environment): dismiss the notice, bypass provider
// setup, then create a session. Conversation scene tabs (对话/轨迹/POMASA)
// only render once a session exists — and, at time of writing, only in the
// real desktop shell; the headless web boot does not surface them.
export async function ensureSession(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForTimeout(1200)
  for (const name of [/Continue/i, /进入/i]) {
    const btn = page.getByRole('button', { name }).first()
    if (await btn.isVisible().catch(() => false)) { await btn.click({ force: true }).catch(() => {}); await page.waitForTimeout(800); break }
  }
  const later = page.getByRole('button', { name: /Configure later/i }).first()
  if (await later.isVisible().catch(() => false)) { await later.click({ force: true }); await page.waitForTimeout(800) }
  const ns = page.getByText('New Session', { exact: true }).first()
  if (await ns.isVisible().catch(() => false)) { await ns.click({ force: true }); await page.waitForTimeout(1500) }
  try {
    await page.locator('textarea').first().waitFor({ timeout: 8000 })
  } catch {
    test.skip(!(await page.getByText('POMASA').count()), 'POMASA tab not reachable in this environment')
  }
}

export async function openPomasaTab(page: Page): Promise<void> {
  await ensureSession(page)
  const tab = page.getByText('POMASA').first()
  if (await tab.isVisible().catch(() => false)) await tab.click({ force: true })
  else test.skip(true, 'POMASA conversation.view tab not rendered in this environment')
}
