import fs from 'node:fs'
import path from 'node:path'
import { pomasaHome, masDir } from './core/paths.js'
import { loadDescriptor } from './core/descriptor.js'
import { loadRegistry, upsertMas } from './core/registry.js'
import { unitListing, unitState, readArtifact } from './core/state.js'
import { writeUserInput } from './core/prompt.js'
import { ensureSkill, skillDir, generationPrompt, runPrompt } from './core/skill.js'

export const name = 'pomasa-studio'
export const inject = ['webServer', 'agentLoop']

const API_BASE = '/pomasa'
const ROUTES = [
  'mas.list',
  'mas.create',
  'mas.get',
  'generation.status',
  'unit.list',
  'unit.state',
  'artifact.read',
  'run.start',
  'run.intervene',
  'run.cancel',
  'run.log',
]

function parseQuery(url) {
  const q = new URL(url, 'http://x').searchParams
  const out = {}
  for (const [k, v] of q) out[k] = v
  return out
}

function jsonResponse(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
  res.end(body)
}

async function readBody(req) {
  let data = ''
  for await (const chunk of req) data += chunk
  return data ? JSON.parse(data) : {}
}

export function apply(ctx, config = {}) {
  const ws = ctx.get('webServer')
  if (ws === undefined) return
  const agentLoop = ctx.get('agentLoop')

  const home = () => pomasaHome(config)
  const gens = ensureSkill(config) // materialize the pinned skill snapshot
  const genSessions = new Map() // masId -> { agent, startedAt }
  const runSessions = new Map() // `${masId}|${unitKey ?? ''}` -> { agent, startedAt }

  function hasMas(masId) {
    return fs.existsSync(masDir(home(), masId))
  }

  function dispatch(masId, unitKey) {
    const gensSession = genSessions.get(masId)
    const runKey = `${masId}|${unitKey || ''}`
    const runSession = runSessions.get(runKey)
    return {
      gen: gensSession,
      run: runSession,
      // generation is complete once pomasa.json appears
      generated: hasMas(masId) && fs.existsSync(path.join(masDir(home(), masId), 'pomasa.json')),
    }
  }

  function masSummary(m) {
    const live = dispatch(m.id)
    const status =
      live.gen && !live.generated
        ? 'generating'
        : live.run
          ? 'running'
          : m.status === 'failed'
            ? 'failed'
            : 'idle'
    return {
      id: m.id,
      name: m.name || m.id,
      description: m.description || '',
      status,
      createdAt: m.createdAt ?? null,
      lastRunAt: m.lastRunAt ?? null,
    }
  }

  function createMas(body, res) {
    const id = String(body.projectId || '').trim().toLowerCase()
    if (!id) return { ok: false, error: 'projectId is required' }
    if (!body.topic) return { ok: false, error: 'topic is required' }
    const root = masDir(home(), id)
    if (fs.existsSync(root)) return { ok: false, error: `mas already exists: ${id}` }

    fs.mkdirSync(path.join(root, 'workspace'), { recursive: true })
    fs.mkdirSync(path.join(root, 'agents'), { recursive: true })
    fs.mkdirSync(path.join(root, 'references'), { recursive: true })
    writeUserInput(config, id, body)

    upsertMas(config, {
      id,
      name: body.name || id,
      description: body.topic.slice(0, 120),
      status: 'generating',
      createdAt: Date.now(),
    })

    // copy any uploaded ref materials into references/input/
    const refs = Array.isArray(body.refFiles) ? body.refFiles : []
    for (const rf of refs) {
      const safe = path.basename(String(rf.name || ''))
      if (!safe) continue
      fs.writeFileSync(path.join(root, 'references', safe), String(rf.content || ''), 'utf8')
    }

    if (!agentLoop) {
      // No session service: leave the MAS scaffolded, generation must be
      // driven externally (e.g. by hand in a chat session).
      return { ok: true, masId: id, generation: 'external' }
    }

    const sessionId = `pomasa-gen-${id}`
    const agent = agentLoop.create(sessionId, {}, { cwd: root })
    genSessions.set(id, { agent, startedAt: Date.now() })
    agent.followup({ role: 'user', content: generationPrompt(gens, id, root) })
    return { ok: true, masId: id, generation: 'session' }
  }

  function startRun(body) {
    const { masId } = body
    if (!hasMas(masId)) return { ok: false, error: `no such mas: ${masId}` }
    const descriptor = loadDescriptor(masDir(home(), masId))
    if (!descriptor) return { ok: false, error: 'mas not generated yet (no pomasa.json)' }

    if (!agentLoop) return { ok: false, error: 'agentLoop service unavailable' }

    const targets = resolveRunTargets(body, descriptor)
    const launched = []
    for (const { key, root } of targets) {
      fs.mkdirSync(root, { recursive: true })
      const sessionId = `pomasa-run-${masId}-${key || 'single'}`
      const agent = agentLoop.create(sessionId, {}, { cwd: root })
      runSessions.set(`${masId}|${key || ''}`, { agent, startedAt: Date.now() })
      agent.followup({ role: 'user', content: runPrompt(masDir(home(), masId), root, key) })
      launched.push(key)
    }
    upsertMas(config, { id: masId, status: 'running', lastRunAt: Date.now() })
    return { ok: true, units: launched }
  }

  function resolveRunTargets(body, descriptor) {
    const workspace = path.join(masDir(home(), descriptor.id), 'workspace')
    if (descriptor.work.mode === 'single') return [{ key: null, root: workspace }]
    const requested = Array.isArray(body.units) ? body.units : null
    const all = unitListing(config, descriptor, descriptor.id)
    const pick = requested && requested.length ? all.filter((u) => requested.includes(u.key)) : all
    return pick.map((u) => ({ key: u.key, root: path.join(workspace, u.key) }))
  }

  async function handleApi(req, res) {
    const u = new URL(req.url, 'http://x')
    const sub = u.pathname.replace(API_BASE, '')
    const q = parseQuery(u.search)
    try {
      // ---- reads ----
      if (sub === '/mas.list') {
        const reg = loadRegistry(config)
        return jsonResponse(res, 200, { ok: true, mas: reg.mas.map(masSummary) })
      }

      if (sub === '/mas.get' && req.method === 'GET') {
        const masId = q.masId
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        const descriptor = loadDescriptor(masDir(home(), masId))
        return jsonResponse(res, 200, { ok: true, descriptor, generated: !!descriptor })
      }

      if (sub === '/generation.status' && req.method === 'GET') {
        const masId = q.masId
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        const live = dispatch(masId)
        const done = fs.existsSync(path.join(masDir(home(), masId), 'pomasa.json'))
        if (done) {
          upsertMas(config, { id: masId, status: 'idle' })
          genSessions.delete(masId)
        }
        return jsonResponse(res, 200, {
          ok: true,
          status: !live.gen ? 'idle' : done ? 'completed' : 'generating',
          step: live.gen ? 'generating' : null,
        })
      }

      if (sub === '/unit.list' && req.method === 'GET') {
        const masId = q.masId
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        const descriptor = loadDescriptor(masDir(home(), masId))
        if (!descriptor) return jsonResponse(res, 200, { ok: true, units: [], generated: false })
        return jsonResponse(res, 200, { ok: true, units: unitListing(config, descriptor, masId) })
      }

      if (sub === '/unit.state' && req.method === 'GET') {
        const masId = q.masId
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        const descriptor = loadDescriptor(masDir(home(), masId))
        if (!descriptor) return jsonResponse(res, 200, { ok: true, generated: false, stages: [] })
        const st = unitState(config, descriptor, masId, q.unit || null)
        return jsonResponse(res, 200, { ok: true, generated: true, ...st })
      }

      if (sub === '/artifact.read' && req.method === 'GET') {
        const masId = q.masId
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        const art = readArtifact(config, masId, q.unit || null, q.path || '')
        return jsonResponse(res, 200, { ok: true, ...art })
      }

      if (sub === '/run.log' && req.method === 'GET') {
        const masId = q.masId
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        const descriptor = loadDescriptor(masDir(home(), masId))
        if (!descriptor) return jsonResponse(res, 200, { ok: true, events: [] })
        const unit = descriptor.work.mode === 'single' ? null : q.unit
        const unitRoot = path.join(masDir(home(), masId), 'workspace', unit ?? '')
        const events = []
        if (fs.existsSync(path.join(unitRoot, 'events.jsonl'))) {
          const lines = fs.readFileSync(path.join(unitRoot, 'events.jsonl'), 'utf8').trim().split('\n').slice(-100)
          for (const line of lines) {
            try {
              events.push(JSON.parse(line))
            } catch {
              /* skip malformed */
            }
          }
        }
        return jsonResponse(res, 200, { ok: true, events })
      }

      // ---- writes ----
      if (sub === '/mas.create' && req.method === 'POST') {
        const body = await readBody(req)
        const r = createMas(body)
        if (!r.ok) return jsonResponse(res, 400, r)
        return jsonResponse(res, 200, r)
      }

      if (sub === '/run.start' && req.method === 'POST') {
        const body = await readBody(req)
        const r = startRun(body)
        if (!r.ok) return jsonResponse(res, 400, r)
        return jsonResponse(res, 200, r)
      }

      if (sub === '/run.intervene' && req.method === 'POST') {
        const body = await readBody(req)
        const s = runSessions.get(`${body.masId}|${body.unit || ''}`)
        if (!s) return jsonResponse(res, 404, { ok: false, error: 'no active run session' })
        s.agent.followup({ role: 'user', content: String(body.message || '') })
        return jsonResponse(res, 200, { ok: true })
      }

      if (sub === '/run.cancel' && req.method === 'POST') {
        const body = await readBody(req)
        const s = runSessions.get(`${body.masId}|${body.unit || ''}`)
        if (s) {
          s.agent.cancel('user')
          runSessions.delete(`${body.masId}|${body.unit || ''}`)
        }
        return jsonResponse(res, 200, { ok: true })
      }

      return jsonResponse(res, 404, { ok: false, error: 'not found' })
    } catch (err) {
      return jsonResponse(res, 500, { ok: false, error: String(err?.message || err) })
    }
  }

  const disposers = ROUTES.map((r) =>
    ws.register({
      kind: 'exact',
      path: `${API_BASE}/${r}`,
      handler: handleApi,
    }),
  )

  return () => {
    for (const d of disposers) d()
  }
}