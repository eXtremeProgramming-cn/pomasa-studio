/**
 * Install-time MCP provisioning: mount the crawl4ai MCP server into the
 * plugin-bearing DSH profiles so generation/run agents get a first-class
 * web-fetch tool, preferred over LLM default tools per ~/.pomasa/AGENTS.md.
 *
 * crawl4ai is provisioned by default. A checked-out copy is used when one is
 * found (e.g. a dev checkout); otherwise a best-effort shallow clone into
 * ~/.pomasa/tools/crawl4ai-mcp-server with a venv and requirements install is
 * attempted once. Any failure skips provisioning silently (agents fall back to
 * curl / LLM tools per the workspace AGENTS.md).
 *
 * Idempotent: an existing `mcp-crawl4ai` entry or an existing local server are
 * left untouched.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const GIT_URL = process.env.POMASA_CRAWL4AI_GIT_URL || 'https://github.com/gigix/crawl4ai-mcp-server.git'

function serverDir() {
  if (process.env.POMASA_CRAWL4AI_DIR) return process.env.POMASA_CRAWL4AI_DIR
  const candidates = [
    path.join(os.homedir(), 'Projects', '01.tools', 'crawl4ai-mcp-server'),
    path.join(os.homedir(), 'crawl4ai-mcp-server'),
  ]
  for (const c of candidates) {
    if (isServer(c)) return c
  }
  return null
}

function isServer(dir) {
  return fs.existsSync(path.join(dir, 'venv', 'bin', 'python')) && fs.existsSync(path.join(dir, 'src', 'index.py'))
}

/** Shallow-clone + venv + pip install the server into ~/.pomasa/tools. Best-effort. */
async function ensureLocalServer(targetDir) {
  if (isServer(targetDir)) return targetDir
  try {
    fs.mkdirSync(path.dirname(targetDir), { recursive: true })
    execFileSync('git', ['clone', '--depth', '1', GIT_URL, targetDir], { stdio: 'ignore', timeout: 120000 })
    execFileSync('python3', ['-m', 'venv', path.join(targetDir, 'venv')], { stdio: 'ignore', timeout: 120000 })
    execFileSync(path.join(targetDir, 'venv', 'bin', 'pip'), ['install', '-r', path.join(targetDir, 'requirements.txt')], { stdio: 'ignore', timeout: 300000 })
    return isServer(targetDir) ? targetDir : null
  } catch {
    return null
  }
}

/** Names of profiles that include this plugin (the ones our sessions run in). */
export function findProfiles(dshHome) {
  const names = new Set()
  const argvProfile = readArgvProfile()
  if (argvProfile) names.add(argvProfile)
  if (process.env.DSH_PROFILE) names.add(process.env.DSH_PROFILE)
  const profilesDir = path.join(dshHome, 'profiles')
  if (fs.existsSync(profilesDir)) {
    for (const name of fs.readdirSync(profilesDir)) {
      const pj = path.join(profilesDir, name, 'package.json')
      if (!fs.existsSync(pj)) continue
      try {
        const pkg = JSON.parse(fs.readFileSync(pj, 'utf8'))
        const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || []
        if (Array.isArray(bundles) && bundles.includes('pomasa-studio')) names.add(name)
      } catch { /* unreadable profile */ }
    }
  }
  return [...names]
}

function readArgvProfile() {
  const argv = process.argv || []
  for (let i = 0; i < argv.length - 1; i += 1) {
    if (argv[i] === '--profile') return argv[i + 1]
  }
  return null
}

/**
 * Ensure the profile's cordis.yml mounts `mcp-crawl4ai`.
 * @param profileDir - profile directory to provision.
 * @returns the server dir used, or null when skipped.
 */
export async function provisionCrawl4ai(profileDir) {
  let dir = serverDir()
  if (!dir) dir = await ensureLocalServer(path.join(process.env.POMASA_HOME || path.join(os.homedir(), '.pomasa'), 'tools', 'crawl4ai-mcp-server'))
  if (!dir) return null
  const entry = `- id: mcp-crawl4ai
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: crawl4ai
    transport: stdio
    command: ${path.join(dir, 'venv', 'bin', 'python')}
    args:
      - ${path.join(dir, 'src', 'index.py')}
    cwd: ${dir}
`
  const file = path.join(profileDir, 'cordis.yml')
  let text = ''
  if (fs.existsSync(file)) {
    text = fs.readFileSync(file, 'utf8')
    if (text.includes('- id: mcp-crawl4ai')) return dir // already provisioned
  }
  const trimmed = text.trim()
  const next = (trimmed === '' || trimmed === '[]') ? entry : `${text.replace(/\s*$/, '')}\n${entry}`
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, next, 'utf8')
  return dir
}

/** Provision to every profile that includes this plugin. Returns [{profileDir, serverDir|null}]. */
export async function provisionAllMcps(dshHome) {
  const out = []
  for (const name of findProfiles(dshHome)) {
    out.push({ profile: name, server: await provisionCrawl4ai(path.join(dshHome, 'profiles', name)) })
  }
  return out
}