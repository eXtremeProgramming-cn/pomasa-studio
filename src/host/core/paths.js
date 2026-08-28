import os from 'node:os'
import path from 'node:path'

/** Resolve the global POMASA home. Config overrides env overrides ~/.pomasa. */
export function pomasaHome(config = {}) {
  return path.resolve(config.pomasaHome || process.env.POMASA_HOME || path.join(os.homedir(), '.pomasa'))
}

export function masDir(home, masId) {
  return path.join(home, masId)
}

/** The packaged POMASA skill snapshot ships inside the plugin package. */
export function packagedSkillDir() {
  return path.resolve(new URL('../../../skill/', import.meta.url).pathname)
}