// Embedded workspace-MCP loader: reads ~/.pomasa/.dsh/mcp.servers.yml and
// mounts each server through the mcp-client that dsh ships by default
// (@deepseek-ai/dsh-mcp-client). Installing pomasa-studio is therefore enough
// for the seeded MCP config to be live — no third-party consumer plugin, no
// cordis.patch.yml edits.
//
// Servers are mounted globally at apply time (one entry = one server, the same
// semantics as declaring them in the profile patch). Load/unload happens on dsh
// restart; editing the yml while dsh is running takes effect on the next
// restart.
import path from 'node:path'
import { readMcpServerConfigs } from './core/mcp-servers.js'

export async function loadMcpServers(ctx, pomasaHome) {
  let configs
  try {
    configs = readMcpServerConfigs(path.join(pomasaHome, '.dsh', 'mcp.servers.yml'))
  } catch (e) {
    return { ok: false, error: 'mcp config unreadable: ' + String((e && e.message) || e) }
  }
  if (!configs.length) return { ok: true, loaded: [] }

  let mcpClient
  try {
    mcpClient = await import('@deepseek-ai/dsh-mcp-client')
  } catch (e) {
    return { ok: false, error: '@deepseek-ai/dsh-mcp-client not resolvable in this dsh runtime: ' + String((e && e.message) || e) }
  }

  const loaded = []
  for (const { serverName, config } of configs) {
    try {
      if (typeof ctx.plugin === 'function') ctx.plugin(mcpClient, config)
      else await mcpClient.apply(ctx, config)
      loaded.push(serverName)
    } catch (e) {
      console.error(`[pomasa] MCP server "${serverName}" failed to mount:`, (e && e.stack) || e)
    }
  }
  return { ok: true, loaded }
}