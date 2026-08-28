/**
 * Install-time MCP provisioning: mount the crawl4ai MCP server into the
 * active DSH profile's cordis.yml so generation/run agents get a first-class
 * web-fetch tool (preferred over LLM default tools per ~/.pomasa/AGENTS.md).
 *
 * Idempotent: an existing `mcp-crawl4ai` entry is left untouched. If the
 * crawl4ai server directory is not found, provisioning is skipped silently.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

function serverDir() {
  if (process.env.POMASA_CRAWL4AI_DIR) return process.env.POMASA_CRAWL4AI_DIR
  const candidates = [
    path.join(os.homedir(), 'Projects', '01.tools', 'crawl4ai-mcp-server'),
    path.join(os.homedir(), 'crawl4ai-mcp-server'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'venv', 'bin', 'python')) && fs.existsSync(path.join(c, 'src', 'index.py'))) return c
  }
  return null
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
 * @returns the server dir used, or null when skipped.
 */
export function provisionCrawl4ai(profileDir) {
  const dir = serverDir()
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
export function provisionAllMcps(dshHome) {
  const out = []
  for (const name of findProfiles(dshHome)) {
    out.push({ profile: name, server: provisionCrawl4ai(path.join(dshHome, 'profiles', name)) })
  }
  return out
}