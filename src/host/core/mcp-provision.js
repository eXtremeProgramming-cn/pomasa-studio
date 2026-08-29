/**
 * Install-time crawl4ai MCP setup, self-contained.
 *
 * The crawl4ai server CODE is vendored in pomasa-home/tools/crawl4ai-mcp-server
 * and copied into ~/.pomasa with the rest of the template. Two things remain
 * for install time (neither can live in a committed file):
 *   1. build the viirtualenv (a venv is machine-specific and cannot be
 *      vendored) at ~/.pomasa/tools/crawl4ai-mcp-server/venv;
 *   2. write ~/.pomasa/.mcp.json pointing the crawl4ai server at that
 *      absolute path (JSON cannot expand ~, and DSH resolves the workspace's
 *      .mcp.json verbatim — absolute paths only, like ~/Projects' file).
 * The destination is deterministic (~/.pomasa), so no external/dev paths are
 * ever referenced. Other servers the user may already have declared in
 * .mcp.json are preserved.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

// mcp>=1.2 and Crawl4AI require Python 3.10+; the OS default `python3` is often
// 3.9 (macOS), which cannot install them. Prefer a 3.10+ interpreter for the venv.
const PY_CANDIDATES = ['python3.13', 'python3.12', 'python3.11', 'python3.10', 'python3']

function serverDir(pomasaHome) {
  return path.join(pomasaHome, 'tools', 'crawl4ai-mcp-server')
}

function pickPython() {
  for (const c of PY_CANDIDATES) {
    try { execFileSync(c, ['--version'], { stdio: 'ignore' }); return c } catch { /* try next */ }
  }
  return 'python3'
}

/**
 * Build the venv once. A stale venv (built with an unusable python, deps missing) is rebuilt.
 */
async function ensureVenv(dir) {
  const bin = path.join(dir, 'venv', 'bin', 'python')
  const pip = path.join(dir, 'venv', 'bin', 'pip')
  if (fs.existsSync(bin)) {
    try { execFileSync(pip, ['show', 'mcp'], { stdio: 'ignore' }); return true } catch { /* stale -> rebuild */ }
    fs.rmSync(path.join(dir, 'venv'), { recursive: true, force: true })
  }
  try {
    execFileSync(pickPython(), ['-m', 'venv', path.join(dir, 'venv')], { stdio: 'ignore', timeout: 120000 })
    execFileSync(path.join(dir, 'venv', 'bin', 'pip'), ['install', '-r', path.join(dir, 'requirements.txt')], { stdio: 'ignore', timeout: 600000 })
    return fs.existsSync(bin)
  } catch {
    return false
  }
}

/**
 * Write <pomasaHome>/.mcp.json declaring the crawl4ai server at @param dir,
 * preserving any other servers the user already declared. Pure write — no venv
 * work — so it is unit-testable without performing a real install.
 */
export function writeMcpDeclaration(pomasaHome, dir) {
  const file = path.join(pomasaHome, '.mcp.json')
  let cfg = { mcpServers: {} }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (parsed && parsed.mcpServers && typeof parsed.mcpServers === 'object') cfg = parsed
  } catch { /* fresh or unreadable file */ }
  cfg.mcpServers.crawl4ai = {
    command: path.join(dir, 'venv', 'bin', 'python'),
    args: [path.join(dir, 'src', 'index.py')],
    cwd: dir,
  }
  fs.mkdirSync(pomasaHome, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n', 'utf8')
  return dir
}

/**
 * Ensure ~/.pomasa/tools/crawl4ai-mcp-server/venv exists and ~/.pomasa/.mcp.json
 * declares the crawl4ai server at that absolute path. Returns the server dir on
 * success, null on failure (agents then fall back to curl / LLM tools).
 */
export async function provisionWorkspaceMcp(pomasaHome) {
  if (!fs.existsSync(path.join(pomasaHome, 'tools', 'crawl4ai-mcp-server', 'src', 'index.py'))) return null
  const dir = serverDir(pomasaHome)
  if (!await ensureVenv(dir)) return null
  return writeMcpDeclaration(pomasaHome, dir)
}