import fs from 'node:fs'
import { pomasaHome } from './src/host/core/paths.js'
import { ensurePomasaHome } from './src/host/core/pomasa-home.js'
import { provisionWorkspaceMcp } from './src/host/core/mcp-provision.js'
const home = pomasaHome({})
console.log('home:', home)
console.log('seeded:', ensurePomasaHome({}))
const dir = await provisionWorkspaceMcp(home)
console.log('server dir:', dir)
console.log('.mcp.json:', fs.readFileSync(home + '/.mcp.json', 'utf8'))
