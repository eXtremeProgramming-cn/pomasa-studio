import { defineConfig } from '@playwright/test'

// L4a browser E2E — deterministic, no model calls: the fixture MAS in
// e2e/fixture-mas carries a completed run (run.json + stage indexes + artifacts).
// Prereqs: npm i -D @playwright/test && npx playwright install chromium
export default defineConfig({
  testDir: './e2e/specs',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:43121',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/servers.mjs',
    url: 'http://127.0.0.1:43121/api/session.list',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})