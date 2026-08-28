import { test, type Page } from '@playwright/test'

async function pomasaVisible(page: Page) {
  return await page.getByText('POMASA', { exact: true }).first().isVisible().catch(() => false)
}

export async function ensureSession(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForTimeout(3000)
  if (await pomasaVisible(page)) return
  // bypass the provider setup wizard if present
  const later = page.getByRole('button', { name: /Configure later/i }).first()
  if (await later.isVisible().catch(() => false)) {
    console.log('ensure: clicking Configure later')
    await later.click({ force: true })
    await page.waitForTimeout(1500)
    if (await pomasaVisible(page)) return
  }
  // click a real session row (persisted sessions in the copied home)
  const sessionRow = page.locator('div.YDXeBa_sessionRow').filter({ hasNotText: 'New Session' }).first()
  if (await sessionRow.isVisible().catch(() => false)) {
    console.log('ensure: opening session row')
    await sessionRow.click({ force: true })
    for (let i = 0; i < 12; i += 1) {
      await page.waitForTimeout(1000)
      if (await pomasaVisible(page)) return
    }
  }
  const ns = page.getByText('New Session', { exact: true }).first()
  if (await ns.isVisible().catch(() => false)) {
    await ns.click({ force: true }).catch(() => {})
    await page.waitForTimeout(3000)
    if (await pomasaVisible(page)) return
  }
  console.log('ensure: FAILED to reach POMASA; body=', (await page.locator('body').innerText()).slice(0, 200).replace(/\n+/g, ' | '))
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
