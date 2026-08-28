// Boot a hermetic dsh web for browser E2E (L4a): temp DSH_HOME + seeded
// POMASA_HOME from e2e/fixture-mas. Dies when the Playwright webServer is killed.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SEED = path.join(ROOT, 'e2e', 'fixture-mas')
const PORT = Number(process.env.POMASA_E2E_PORT || 43121)

const base = path.join(os.tmpdir(), `pomasa-e2e-${process.pid}`)
const pomasaHome = path.join(base, 'pomasa_home')
const dshHome = path.join(base, 'dsh_home')
fs.mkdirSync(dshHome, { recursive: true })
fs.cpSync(SEED, pomasaHome, { recursive: true })

const env = Object.assign({}, process.env, { DSH_HOME: dshHome, POMASA_HOME: pomasaHome })

execFileSync('dsh', ['--profile', 'web', '--help'], { env, stdio: 'ignore' })
execFileSync('dsh', ['plugin', '--profile', 'web', 'add', ROOT], { env, stdio: 'ignore' })

const proc = spawn('dsh', ['--profile', 'web', '--no-open', '--port', String(PORT), '--trusted-host', `127.0.0.1:${PORT}`], { env })
proc.stdout?.on('data', () => {})
proc.stderr?.on('data', () => {})

for (let i = 0; i < 90; i += 1) {
  await new Promise((r) => setTimeout(r, 500))
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/session.list`)
    if (res.ok) {
      console.log(`POMASA_STUDIO_E2E_READY http://127.0.0.1:${PORT}`)
      setInterval(() => {}, 1 << 30) // keep this process alive; killed by Playwright at teardown
      break
    }
  } catch { /* not up yet */ }
  if (i === 89) {
    process.exitCode = 1
    console.error('dsh web did not become ready')
  }
}