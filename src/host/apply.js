import fs from 'node:fs'
import path from 'node:path'
import { pomasaHome, masDir } from './core/paths.js'
import { loadDescriptor } from './core/descriptor.js'
import { loadRegistry, saveRegistry, upsertMas } from './core/registry.js'
import { unitListing, unitState, readArtifact } from './core/state.js'
import { writeUserInput } from './core/prompt.js'
import { ensureSkill, generationPrompt, runPrompt } from './core/skill.js'

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
  'generation.log',
  'mas.delete',
]

// agent.followup expects a typed dsh-session UserMessage (content blocks +
// source). A raw { role, content: string } trips the runtime-context
// projection's `message.source.kind` read -> "Cannot read ... 'kind'".
function promptMessage(text) {
  return { role: 'user', content: [{ type: 'text', text }], source: { kind: 'plugin', plugin: 'pomasa-studio' } }
}

// Bare agentLoop sessions lack a model, which leaves prompt-template variables
// like {{model}} unfilled ("prompt variable ... has no value"). Resolution is
// the profile's agent-default-model in DSH_HOME/settings.yaml.
function defaultModel() {
  try {
    const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
    const txt = fs.readFileSync(path.join(home, 'settings.yaml'), 'utf8')
    const block = txt.match(/agent-default-model:\s*\n((?:[ \t].*\n)*)/)
    if (!block) return null
    let model = null
    let provider = null
    for (const line of block[1].split('\n')) {
      const pm = line.match(/^\s*model:\s*["']?([^\s"']+)/)
      if (pm) model = pm[1]
      const pv = line.match(/^\s*provider:\s*["']?([^\s"']+)/)
      if (pv) provider = pv[1]
    }
    return model ? { model, ...(provider ? { provider } : {}) } : null
  } catch {
    return null
  }
}

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
  const genSessions = new Map() // masId -> { agent, sessionId, startedAt }
  const runSessions = new Map() // `${masId}|${unitKey ?? ''}` -> { agent, sessionId, startedAt }
  const sessionOwner = new Map() // sessionId -> { masId, kind: 'gen' | 'run' }
  let sessionSeq = 0
  // DSH refuses to re-create a session whose id already has a persisted log that
  // differs from the live one (id collision). Session ids are therefore unique
  // per attempt instead of fixed per masId/unit.
  function newSessionId(prefix) {
    sessionSeq += 1
    return `${prefix}-${sessionSeq}-${Date.now()}`
  }

  function hasMas(masId) {
    return fs.existsSync(masDir(home(), masId))
  }

  // Bare agentLoop.create sessions lack the model selection ({{model}} etc.) and
  // the preset setup that real sessions get. Mirror the harness's own headless
  // driver instead: resolve the agentDefaultModel selection, create the agent via
  // the agents registry (which composes the session the normal way), and install
  // the model selection into the agent's scope.
  async function createAgentSession(sessionId, cwd, promptText) {
    const agents = ctx.get('agents')
    if (agents === undefined || typeof agents.create !== 'function') return null
    // loader siblings mount concurrently; wait for the complete application
    // before creating an agent (mirrors the headless driver's readiness await)
    try { await ctx.get('loader')?.await?.() } catch { /* loader optional */ }
    const modelSvc = ctx.get('agentDefaultModel')
    const selection = (modelSvc && typeof modelSvc.currentSelection === 'function') ? modelSvc.currentSelection() : null
    const agentOptions = selection && selection.model
      ? { provider: selection.provider, model: selection.model }
      : defaultModel() || {}
    const agentPkg = await import('@deepseek-ai/dsh-agent').catch(() => null)
    const { agent } = await agents.create({
      sessionId,
      meta: { cwd },
      agentOptions,
      // installModelSelection returns a disposer FUNCTION; setupAndPublish does
      // `setupCommit?.commit()`, so the callback must return nothing (block
      // body) exactly like the headless driver. An expression body hands the
      // disposer to commit() -> "(intermediate value)?.commit is not a function".
      setup: agentPkg && selection
        ? (agentCtx) => { agentPkg.installModelSelection(agentCtx, { current: selection, assembled: undefined }) }
        : undefined,
    })
    agent.followup(promptMessage(promptText))
    return agent
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

  // If a generation session ends without leaving pomasa.json behind, mark the
  // MAS as failed instead of staying "generating" forever.
  if (typeof ctx.on === 'function') {
    ctx.on('agent/disposed', (info) => {
      const sessionId = (info && (info.id ?? info.agentId ?? info.sessionId)) || ''
      if (typeof sessionId !== 'string' || !sessionId) return
      const owner = sessionOwner.get(sessionId)
      if (!owner) return
      sessionOwner.delete(sessionId)
      if (owner.kind === 'gen') {
        const masId = owner.masId
        if (!genSessions.has(masId)) return
        const generated = fs.existsSync(path.join(masDir(home(), masId), 'pomasa.json'))
        genSessions.delete(masId)
        if (!generated) upsertMas(config, { id: masId, status: 'failed' })
      } else if (owner.runKey) {
        runSessions.delete(owner.runKey)
      }
    })
  }

  // Read a DSH session's transcript (messages, tool calls, thinking) from the
  // session persistence backend. Returns null when unavailable.
  async function sessionLog(sessionId) {
    if (!sessionId) return null
    let persistence
    try {
      persistence = ctx.get?.('sessionPersistence')
    } catch { /* context may not expose it */ }
    if (!persistence || typeof persistence.inspect !== 'function') return null
    try {
      const inspected = await persistence.inspect(sessionId)
      return { sessionId, meta: inspected.meta, events: inspected.events || [] }
    } catch {
      return null
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

  async function createMas(body) {
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

    if (config.fastGeneration === true || process.env.POMASA_TEST_FAST_GENERATION === '1') {
      // Test-only mock generation: no LLM call. Streams a few fake session
      // events, then copies a prebuilt MAS skeleton into the root (which flips
      // generation.status to completed). Exercises the full UI/host flow
      // deterministically and fast.
      const fakeSessionId = `pomasa-gen-${id}`
      const events = []
      const push = (type, data) => events.push({ type, seq: events.length + 1, time: Date.now(), data })
      push('message', { role: 'assistant', content: '开始生成 MAS：读取 POMASA skill 与模式目录（mock）。' })
      push('tool', { name: 'read', arguments: JSON.stringify({ file: 'SKILL.md' }) })
      push('tool', { name: 'read', arguments: JSON.stringify({ file: 'pattern-catalog/README.md' }) })
      setTimeout(() => {
        const srcRoot = path.resolve(new URL('../../fixtures/mock-generated', import.meta.url).pathname)
        fs.cpSync(srcRoot, root, { recursive: true })
        const pj = path.join(root, 'pomasa.json')
        let txt = fs.readFileSync(pj, 'utf8')
        txt = txt.split('PLACEHOLDER_MAS_ID').join(id).split('MOCK_MAS_NAME').join(body.name || id)
        fs.writeFileSync(pj, txt)
        push('tool', { name: 'write', arguments: JSON.stringify({ file: 'agents/00.orchestrator.md' }) })
        push('message', { role: 'assistant', content: 'MAS 骨架生成完成（mock）：pomasa.json 已写入。' })
      }, 3000)
      genSessions.set(id, { agent: null, sessionId: fakeSessionId, fast: true, events, startedAt: Date.now() })
      return { ok: true, masId: id, generation: 'session' }
    }

    const sessionId = newSessionId('pomasa-gen')
    const agent = await createAgentSession(sessionId, root, generationPrompt(gens, id, root))
    if (!agent) return { ok: true, masId: id, generation: 'external' }
    genSessions.set(id, { agent, sessionId, startedAt: Date.now() })
    sessionOwner.set(sessionId, { masId: id, kind: 'gen' })
    upsertMas(config, { id, lastGenSessionId: sessionId })
    return { ok: true, masId: id, generation: 'session' }
  }

  async function startRun(body) {
    const { masId } = body
    if (!hasMas(masId)) return { ok: false, error: `no such mas: ${masId}` }
    const descriptor = loadDescriptor(masDir(home(), masId))
    if (!descriptor) return { ok: false, error: 'mas not generated yet (no pomasa.json)' }

    if (!agentLoop) return { ok: false, error: 'agentLoop service unavailable' }

    const targets = resolveRunTargets(body, descriptor)
    const launched = []
    const runSessionIds = {}
    for (const { key, root } of targets) {
      fs.mkdirSync(root, { recursive: true })
      const sessionId = newSessionId('pomasa-run')
      const agent = await createAgentSession(sessionId, root, runPrompt(masDir(home(), masId), root, key))
      if (!agent) return { ok: false, error: 'agent 会话服务不可用（agents.create 未提供）' }
      const runKey = `${masId}|${key || ''}`
      runSessions.set(runKey, { agent, sessionId, startedAt: Date.now() })
      sessionOwner.set(sessionId, { masId, kind: 'run', runKey })
      runSessionIds[`${key || 'single'}`] = sessionId
      launched.push(key)
    }
    const reg = loadRegistry(config)
    const existing = (reg.mas.find((m) => m.id === masId) || {})
    upsertMas(config, { id: masId, status: 'running', lastRunAt: Date.now(), lastRunSessionIds: { ...(existing.lastRunSessionIds || {}), ...runSessionIds } })
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
        let status
        if (done) {
          upsertMas(config, { id: masId, status: 'idle' })
          genSessions.delete(masId)
          status = 'completed'
        } else if (live.gen) {
          status = 'generating'
        } else {
          const reg = loadRegistry(config)
          const m = reg.mas.find((x) => x.id === masId)
          status = m && m.status === 'failed' ? 'failed' : 'idle'
        }
        return jsonResponse(res, 200, { ok: true, status, step: live.gen ? 'generating' : null })
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
        if (!descriptor) return jsonResponse(res, 200, { ok: true, log: null, events: [] })
        const unit = descriptor.work.mode === 'single' ? '' : (q.unit || '')
        const runKey = `${masId}|${unit}`
        const live = runSessions.get(runKey)
        const regGuess = loadRegistry(config).mas.find((m) => m.id === masId)
        const sid = (live && live.sessionId)
          || (regGuess && regGuess.lastRunSessionIds && regGuess.lastRunSessionIds[unit || 'single'])
          || null
        const log = sid ? await sessionLog(sid) : null
        if (log) return jsonResponse(res, 200, { ok: true, log, events: [] })
        // fallback: events.jsonl in the unit root
        const unitRoot = path.join(masDir(home(), masId), 'workspace', unit)
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
        return jsonResponse(res, 200, { ok: true, log: null, events })
      }

      if (sub === '/generation.log' && req.method === 'GET') {
        const masId = q.masId
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        const live = genSessions.get(masId)
        if (live && live.fast) return jsonResponse(res, 200, { ok: true, log: { sessionId: live.sessionId, events: live.events || [] } })
        const regGuess = loadRegistry(config).mas.find((m) => m.id === masId)
        const sid = (live && live.sessionId) || (regGuess && regGuess.lastGenSessionId) || null
        const log = sid ? await sessionLog(sid) : null
        return jsonResponse(res, 200, { ok: true, log })
      }

      // ---- writes ----
      if (sub === '/mas.create' && req.method === 'POST') {
        const body = await readBody(req)
        const r = await createMas(body)
        if (!r.ok) return jsonResponse(res, 400, r)
        return jsonResponse(res, 200, r)
      }

      if (sub === '/run.start' && req.method === 'POST') {
        const body = await readBody(req)
        const r = await startRun(body)
        if (!r.ok) return jsonResponse(res, 400, r)
        return jsonResponse(res, 200, r)
      }

      if (sub === '/run.intervene' && req.method === 'POST') {
        const body = await readBody(req)
        const s = runSessions.get(`${body.masId}|${body.unit || ''}`)
        if (!s) return jsonResponse(res, 404, { ok: false, error: 'no active run session' })
        s.agent.followup(promptMessage(String(body.message || '')))
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

      if (sub === '/mas.delete' && req.method === 'POST') {
        const body = await readBody(req)
        const masId = String(body.masId || '')
        if (!hasMas(masId)) return jsonResponse(res, 404, { ok: false, error: 'no such mas' })
        // stop and drop active sessions, then remove the MAS home + registry row
        const gen = genSessions.get(masId)
        if (gen && gen.agent && typeof gen.agent.cancel === 'function') {
          try { gen.agent.cancel('user') } catch { /* already gone */ }
        }
        genSessions.delete(masId)
        for (const [key, s] of runSessions) {
          if (key.startsWith(`${masId}|`)) {
            try { if (s.agent && typeof s.agent.cancel === 'function') s.agent.cancel('user') } catch { /* already gone */ }
            runSessions.delete(key)
          }
        }
        fs.rmSync(masDir(home(), masId), { recursive: true, force: true })
        for (const [sid, owner] of sessionOwner) {
          if (owner.masId === masId) sessionOwner.delete(sid)
        }
        const reg = loadRegistry(config)
        reg.mas = reg.mas.filter((m) => m.id !== masId)
        saveRegistry(config, reg)
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