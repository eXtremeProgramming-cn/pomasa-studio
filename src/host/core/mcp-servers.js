// Minimal YAML reader for `.dsh/mcp.servers.yml` — just enough for the dsh
// workspace-MCP convention:
//
//   servers:
//     my-server:
//       transport: stdio
//       command: uvx
//       args: ["--from", "some-mcp", "run"]
//       env:
//         KEY: value
//     remote:
//       transport: streamable-http
//       url: https://example.com/mcp
//       headers:
//         Authorization: "Bearer <token>"
//
// Everything else (anchors, multiline, tags besides !!js process.env.X) is
// intentionally unsupported: this only consumes files seeded by the template.

import fs from 'node:fs'

const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

function stripComment(line) {
  // a `#` starts a comment when at line start or preceded by whitespace
  const i = line.indexOf('#')
  if (i > 0 && /\s/.test(line[i - 1])) return line.slice(0, i)
  return line
}

function parseScalar(raw) {
  let s = raw.trim()
  if (s.startsWith('"') && s.endsWith('"') && s.length >= 2) return s.slice(1, -1)
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) return s.slice(1, -1)
  // single-line `!!js process.env.NAME` credential reference
  if (s.startsWith('!!js ')) {
    const m = s.match(/^!!js\s+process\.env\.([A-Za-z_][A-Za-z0-9_]*)\s*$/)
    if (m) return process.env[m[1]] ?? ''
    throw new Error(`unsupported !!js expression: ${s.slice(0, 40)}`)
  }
  return s
}

function parseFlowArray(raw) {
  const s = raw.trim()
  if (!s.startsWith('[') || !s.endsWith(']')) return null
  const inner = s.slice(1, -1)
  if (!inner.trim()) return []
  return inner
    .split(',')
    .map((x) => parseScalar(x))
    .filter((x) => x !== '')
}

function parseServersYaml(text) {
  const lines = text.split(/\r?\n/)
  const servers = {}
  let current = null
  let currentSection = null // 'env' | 'headers' | null

  const assign = (key, value) => {
    if (!current) return
    if (currentSection) {
      if (!current[currentSection]) current[currentSection] = {}
      current[currentSection][key] = value
    } else {
      current[key] = value
    }
  }

  for (const raw of lines) {
    const line = stripComment(raw)
    if (!line.trim()) continue
    if (/^\s*#/.test(line)) continue
    const indent = line.match(/^\s*/)[0].length
    const content = line.trim()
    if (indent === 0) {
      if (content === 'servers:') { current = null; currentSection = null; continue }
      continue // ignore other top-level keys
    }
    if (indent === 2) {
      // `name:` — a new server entry
      if (!content.endsWith(':')) continue
      const name = content.slice(0, -1).trim().replace(/["']/g, '')
      if (!name || !SERVER_NAME_PATTERN.test(name)) continue
      servers[name] = {}
      current = servers[name]
      currentSection = null
      continue
    }
    // indent >= 4 — field line `key: value` or section header with empty value
    if (!current) continue
    const sep = content.indexOf(':')
    if (sep < 0 || content.startsWith('- ')) continue
    const key = content.slice(0, sep).trim()
    const rest = content.slice(sep + 1).trim()
    if (key === 'env' || key === 'headers') {
      currentSection = key
      current[key] = {}
      continue
    }
    if (rest === '') continue
    if (key === 'args') {
      const arr = parseFlowArray(rest)
      if (arr) current[key] = arr
      continue
    }
    assign(key, parseScalar(rest))
  }
  return servers
}

function toMcpConfig(name, def) {
  if (!def || typeof def !== 'object') return { serverName: name, error: 'empty server entry' }
  const transport = String(def.transport || '')
  if (transport === 'stdio') {
    if (!def.command) return { serverName: name, error: 'stdio server needs command' }
    return {
      serverName: name,
      config: {
        serverName: name,
        transport: 'stdio',
        command: String(def.command),
        args: Array.isArray(def.args) ? def.args.map(String) : [],
        env: (def.env && typeof def.env === 'object') ? def.env : {},
      },
    }
  }
  if (transport === 'streamable-http') {
    if (!def.url) return { serverName: name, error: 'streamable-http server needs url' }
    return {
      serverName: name,
      config: {
        serverName: name,
        transport: 'streamable-http',
        url: String(def.url),
        headers: (def.headers && typeof def.headers === 'object') ? def.headers : {},
      },
    }
  }
  return { serverName: name, error: `unsupported transport: ${transport || '(missing)'}` }
}

/** Parse ~/.pomasa/.dsh/mcp.servers.yml into a list of mcp-client configs. */
export function readMcpServerConfigs(file) {
  if (!fs.existsSync(file)) return []
  const text = fs.readFileSync(file, 'utf8')
  const parsed = parseServersYaml(text)
  const out = []
  for (const name of Object.keys(parsed)) {
    const r = toMcpConfig(name, parsed[name])
    if (r.config) out.push({ serverName: name, config: r.config })
    else console.error(`[pomasa] mcp server "${name}" skipped: ${r.error}`)
  }
  return out
}

export const __internals = { parseServersYaml, toMcpConfig }