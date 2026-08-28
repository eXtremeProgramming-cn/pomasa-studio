#! /usr/bin/env node
// Manual invocation of the crawl4ai MCP provisioning for the given (or all
// plugin-bearing) DSH profiles. The plugin also runs this at startup; use this
// to force-setup or to verify what the plugin would do.
import os from 'node:os'
import path from 'node:path'
import { provisionAllMcps } from '../src/host/core/mcp-provision.js'

const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const out = provisionAllMcps(dshHome)
console.log(JSON.stringify(out, null, 2))
console.log(out.some((p) => p.server) ? 'OK: crawl4ai MCP mounted' : 'SKIP: crawl4ai server not found (set POMASA_CRAWL4AI_DIR)')
process.exit(out.some((p) => p.server) ? 0 : 2)