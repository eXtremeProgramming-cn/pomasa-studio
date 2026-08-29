import fs from 'node:fs'
import path from 'node:path'

/**
 * Read and normalize the MAS descriptor (pomasa.json).
 * Field names are tolerant to both the DESIGN schema (id, agent_file, contracts[].id)
 * and what the generator actually emits (mas_id, agent, contracts[].artifact) —
 * see DESIGN appendix A.
 */
export function loadDescriptor(masRoot) {
  const file = path.join(masRoot, 'pomasa.json')
  if (!fs.existsSync(file)) return null
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
  const descriptor = {
    id: raw.mas_id || raw.id || path.basename(masRoot),
    name: raw.name || raw.id || path.basename(masRoot),
    description: raw.description || '',
    schemaVersion: raw.schema_version || 'unknown',
    generationTime: raw.created_at ?? null,
    stages: [],
    work: normalizeWork(raw.work),
  }
  if (Array.isArray(raw.stages)) {
    descriptor.stages = raw.stages.map((s, i) => ({
      index: s.index ?? i,
      id: s.id ?? `stage${i}`,
      title: s.title ?? s.id ?? `Stage ${i}`,
      agent: normalizeAgentPath(s.agent_file || s.agent),
      kind: s.kind ?? 'stage',
      contracts: Array.isArray(s.contracts) ? s.contracts.map(normalizeContract) : [],
    }))
  }
  return descriptor
}

/**
 * Agent blueprint paths are MAS-root-relative. The generator emits bare
 * filenames ("01.initial_scanner.md"), our fixtures use the "agents/..." form,
 * and some stages carry a PROSE agent value instead of a file (e.g. an
 * orchestrator described as "orchestrator（执行 ...）"). Normalize only values
 * that actually look like blueprint files: bare doc filenames get the agents/
 * prefix; path-like values are kept as-is; anything else becomes null so
 * completion checks and blueprint reads don't chase a nonexistent file.
 */
function normalizeAgentPath(p) {
  if (!p) return null
  const s = String(p).trim()
  if (!s) return null
  if (s.includes('/')) return /\.(md|markdown|txt|json)$/i.test(s) ? s : null
  return /^[A-Za-z0-9._-]+\.(md|markdown|txt|json)$/i.test(s) ? 'agents/' + s : null
}

export function normalizeWork(work) {
  if (!work) return { mode: 'single', dimensions: [], units: null, unitsIndex: null, unitLayout: null }
  return {
    mode: work.mode === 'multi' ? 'multi' : 'single',
    dimensions: Array.isArray(work.dimensions) ? work.dimensions : [],
    units: Array.isArray(work.units) ? work.units.slice() : null,
    unitsIndex: work.units_index || work.unitsIndex || null,
    unitLayout: work.unit_layout || work.unitLayout || null,
  }
}

export function normalizeContract(c) {
  return {
    id: c.artifact ?? c.id ?? null,
    title: c.title ?? c.artifact ?? c.id ?? 'artifact',
    shape: c.shape ?? 'multi-file',
    format: c.format ?? null,
    pathGlob: c.path_glob || c.pathGlob || null,
    indexPath: c.index_path || c.indexPath || null,
    schema: Array.isArray(c.schema) ? c.schema : [],
  }
}