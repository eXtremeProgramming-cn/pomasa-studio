/**
 * The user-facing ~/.pomasa is provisioned from a checked-in template
 * (pomasa-home/ at the repo root) so the shipped shape is one visible
 * directory to maintain. Existing user files are never overwritten.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pomasaHome } from './paths.js'

export function templatePomasaHome() {
  return path.resolve(new URL('../../../pomasa-home', import.meta.url).pathname)
}

/**
 * Copy the template into ~/.pomasa, adding missing files only.
 * @param config - plugin config (pomasaHome override or default).
 * @returns true when the template was found and applied.
 */
export function ensurePomasaHome(config) {
  const src = templatePomasaHome()
  const dst = pomasaHome(config)
  if (!fs.existsSync(src)) return false
  fs.mkdirSync(dst, { recursive: true })
  const walk = (s, d) => {
    for (const e of fs.readdirSync(s, { withFileTypes: true })) {
      const sp = path.join(s, e.name)
      const dp = path.join(d, e.name)
      if (e.isDirectory()) {
        fs.mkdirSync(dp, { recursive: true })
        walk(sp, dp)
      } else if (!fs.existsSync(dp)) {
        fs.mkdirSync(path.dirname(dp), { recursive: true })
        fs.copyFileSync(sp, dp)
      }
    }
  }
  walk(src, dst)
  return true
}