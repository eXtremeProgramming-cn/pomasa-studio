import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Resolve the global POMASA home. Returns the REALPATH: DSH compares workspace
 * and session paths verbatim, and on macOS /tmp is a symlink to /private/tmp —
 * a resolved-but-not-realpath path would mismatch the workspace the host
 * registers, breaking session grouping.
 */
export function pomasaHome(config = {}) {
  const resolved = path.resolve(config.pomasaHome || process.env.POMASA_HOME || path.join(os.homedir(), '.pomasa'))
  try { return fs.realpathSync(resolved) } catch { return resolved }
}

export function masDir(home, masId) {
  return path.join(home, masId)
}

/** The packaged POMASA skill snapshot ships inside the plugin package. */
export function packagedSkillDir() {
  return path.resolve(new URL('../../../skill/', import.meta.url).pathname)
}