import fs from 'node:fs'
import path from 'node:path'
import { masDir, pomasaHome } from './paths.js'

/** Unit roots for a descriptor. single mode: the workspace dir itself. */
export function unitRoots(config, descriptor, masId) {
  const workspace = path.join(masDir(pomasaHome(config), masId), 'workspace')
  if (descriptor.work.mode === 'single') {
    return fs.existsSync(workspace) ? [{ key: null, root: workspace }] : []
  }
  if (!fs.existsSync(workspace)) return []
  return fs
    .readdirSync(workspace, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ key: e.name, root: path.join(workspace, e.name) }))
}

/** Units known ahead (declared or enumerated), even if not yet run. */
export function plannedUnits(config, descriptor, masId) {
  if (descriptor.work.mode === 'single') return []
  const out = []
  if (Array.isArray(descriptor.work.units)) {
    for (const k of descriptor.work.units) out.push({ key: k, source: 'declared' })
  }
  if (descriptor.work.unitsIndex) {
    const file = path.join(masDir(pomasaHome(config), masId), descriptor.work.unitsIndex)
    if (fs.existsSync(file)) {
      try {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
        const list = Array.isArray(raw) ? raw : (raw.units ?? raw.entries ?? [])
        for (const u of list) {
          const key = typeof u === 'string' ? u : (u.key ?? u.id)
          if (typeof key === 'string') out.push({ key, source: 'enumerated' })
        }
      } catch {
        /* unreadable enumeration is not fatal */
      }
    }
  }
  return out
}

/** Unit listing for the run selector: existing units plus planned-not-run. */
export function unitListing(config, descriptor, masId) {
  const existing = unitRoots(config, descriptor, masId)
  const planned = plannedUnits(config, descriptor, masId)
  const byKey = new Map(planned.map((p) => [p.key, p]))
  const seen = new Set()
  const list = []
  for (const u of existing) {
    seen.add(u.key)
    const p = u.key != null ? byKey.get(u.key) : null
    list.push({ key: u.key, run: u.key != null && fs.existsSync(path.join(u.root, 'run.json')), planned: !!p, source: p?.source })
  }
  for (const p of planned) {
    if (!seen.has(p.key)) list.push({ key: p.key, run: false, planned: true, source: p.source })
  }
  return list
}

export function readRunState(unit) {
  const file = path.join(unit.root, 'run.json')
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function readIndex(unit, contract) {
  if (!contract.indexPath) return { entries: null }
  const file = path.join(unit.root, contract.indexPath)
  if (!fs.existsSync(file)) return { entries: null }
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return { entries: null, invalid: true, file }
  }
  const list = Array.isArray(raw) ? raw : (raw.entries ?? raw.items ?? raw.versions ?? raw.files ?? [])
  return { entries: Array.isArray(list) ? list : null }
}

/**
 * Aggregate the full state of one unit: run.json timeline plus per-stage
 * artifact instances from each contract's index file.
 */
export function unitState(config, descriptor, masId, unitKey) {
  const units = unitRoots(config, descriptor, masId)
  const unit = unitKey ? units.find((u) => u.key === unitKey) : units[0]
  if (!unit) return { unitKey, found: false, run: null, stages: [] }
  return aggregateUnit(unit, descriptor)
}

export function aggregateUnit(unit, descriptor) {
  const run = readRunState(unit)
  const runStages = new Map((run?.stages || []).map((s) => [s.index, s]))
  const stages = descriptor.stages.map((stage) => {
    const runStage = runStages.get(stage.index) || null
    const contracts = stage.contracts.map((contract) => {
      const idx = readIndex(unit, contract)
      return {
        id: contract.id,
        title: contract.title,
        shape: contract.shape,
        indexPath: contract.indexPath,
        index: idx.entries,
        invalid: idx.invalid || false,
      }
    })
    const count = contracts.reduce((n, c) => n + (Array.isArray(c.index) ? c.index.length : 0), 0)
    return {
      index: stage.index,
      id: stage.id,
      title: stage.title,
      kind: stage.kind,
      status: runStage?.status || inferStatus(contracts),
      startedAt: runStage?.started_at ?? null,
      finishedAt: runStage?.finished_at ?? null,
      artifactCount: count,
      contracts,
    }
  })
  return {
    unitKey: unit.key,
    found: true,
    unitRoot: unit.root,
    run,
    stages,
  }
}

function inferStatus(contracts) {
  return contracts.some((c) => Array.isArray(c.index) && c.index.length > 0) ? 'completed' : 'waiting'
}

/** Read an artifact file, refusing any path that escapes the unit root. */
export function readArtifact(config, masId, unitKey, relPath) {
  const base = path.resolve(path.join(masDir(pomasaHome(config), masId), 'workspace', unitKey ?? ''))
  const target = path.resolve(base, relPath)
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('path escapes unit root')
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    throw new Error(`not found: ${relPath}`)
  }
  const content = fs.readFileSync(target, 'utf8')
  const ext = path.extname(target).toLowerCase()
  const format = ext === '.md' ? 'markdown' : ext === '.json' ? 'json' : 'text'
  return { path: path.relative(base, target), format, size: Buffer.byteLength(content), content }
}