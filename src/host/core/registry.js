import fs from 'node:fs'
import path from 'node:path'
import { pomasaHome } from './paths.js'

export function loadRegistry(config) {
  const file = path.join(pomasaHome(config), 'registry.json')
  if (!fs.existsSync(file)) return { version: 1, mas: [] }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return { version: 1, mas: [] }
  }
}

export function saveRegistry(config, reg) {
  const file = path.join(pomasaHome(config), 'registry.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(reg, null, 2))
}

export function upsertMas(config, patch) {
  const reg = loadRegistry(config)
  const i = reg.mas.findIndex((m) => m.id === patch.id)
  if (i >= 0) reg.mas[i] = { ...reg.mas[i], ...patch }
  else reg.mas.unshift({ id: patch.id, status: 'idle', createdAt: Date.now(), ...patch })
  saveRegistry(config, reg)
  return reg.mas.find((m) => m.id === patch.id)
}