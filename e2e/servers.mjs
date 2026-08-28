// Boot a hermetic dsh web for browser E2E. Two modes:
//   default:  empty web profile + this plugin (fixture POMASA_HOME)
//   POMASA_E2E_SRC_HOME=user: copy the user's whole ~/.dsh (settings, sessions,
//   profiles) into a temp DSH_HOME, so the browser sees the same environment
//   as the desktop app (conversation scenes included). Temp home is deleted on
//   exit.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SEED = path.join(ROOT, 'e2e', 'fixture-mas')
const PORT = Number(process.env.POMASA_E2E_PORT || 43121)

const base = '/tmp/pomasa-e2e-live'
fs.rmSync(base, { recursive: true, force: true })
const pomasaHome = path.join(base, 'pomasa_home')
const dshHome = path.join(base, 'dsh_home')
fs.mkdirSync(dshHome, { recursive: true })

let proc

function cleanup() {
  try {
    if (proc) proc.kill('SIGKILL')
    fs.rmSync(base, { recursive: true, force: true })
  } catch { /* ignore */ }
}
process.on('exit', cleanup)
process.on('SIGTERM', () => { cleanup(); process.exit(0) })
process.on('SIGINT', () => { cleanup(); process.exit(0) })

fs.cpSync(SEED, pomasaHome, { recursive: true })

let env = Object.assign({}, process.env, {
  DSH_HOME: dshHome,
  POMASA_HOME: pomasaHome,
  // E2E never calls a real LLM: generation is mocked (fast, deterministic),
  // unless POMASA_E2E_FAST=0 opts into the real provider (needs API key).
  POMASA_TEST_FAST_GENERATION: process.env.POMASA_E2E_FAST === '0' ? '0' : '1',
})

if (process.env.POMASA_E2E_SRC_HOME === 'user') {
  // Copy the user's sessions + model settings (not profiles, whose node_modules
  // would blow the copy); dsh auto-creates a fresh web profile + this plugin.
  const src = path.join(os.homedir(), '.dsh')
  if (!fs.existsSync(src)) {
    console.error('~/.dsh not found')
    process.exit(1)
  }
  fs.cpSync(src, dshHome, {
    recursive: true,
    filter: (p) => !p.includes('node_modules') && !p.split(path.sep).includes('profiles'),
  })
  execFileSync('dsh', ['--profile', 'web', '--help'], { env, stdio: 'ignore' })
  execFileSync('dsh', ['plugin', '--profile', 'web', 'add', ROOT], { env, stdio: 'ignore' })
} else {
  execFileSync('dsh', ['--profile', 'web', '--help'], { env, stdio: 'ignore' })
  execFileSync('dsh', ['plugin', '--profile', 'web', 'add', ROOT], { env, stdio: 'ignore' })
}

proc = spawn('dsh', ['--profile', 'web', '--no-open', '--port', String(PORT), '--trusted-host', `127.0.0.1:${PORT}`], { env })
proc.stdout?.on('data', () => {})
proc.stderr?.on('data', () => {})

for (let i = 0; i < 120; i += 1) {
  await new Promise((r) => setTimeout(r, 500))
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/pomasa/mas.list`)
    if (res.ok) {
      const body = await res.json()
      if (body && body.ok) {
        console.log(`POMASA_STUDIO_E2E_READY http://127.0.0.1:${PORT}`)
        setInterval(() => {}, 1 << 30)
        break
      }
    }
  } catch { /* not up yet */ }
  if (i === 119) {
    process.exitCode = 1
    console.error('dsh web did not become ready')
  }
}