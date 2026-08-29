/**
 * pomasa-studio verify
 *
 * L1 (unit): ~/.pomasa file contract logic — descriptor parsing, unit
 * resolution, run/index aggregation, path-traversal guard.
 * L2 (host): full RPC lifecycle over a mock ctx (webServer + agentLoop),
 * no DSH, no browser.
 *
 * Usage: node verify.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const { loadDescriptor, normalizeContract } = await import(path.join(ROOT, 'src/host/core/descriptor.js'))
const { unitRoots, plannedUnits, unitListing, unitState, readArtifact } = await import(path.join(ROOT, 'src/host/core/state.js'))
const { buildUserInput } = await import(path.join(ROOT, 'src/host/core/prompt.js'))
const { ensurePomasaHome, templatePomasaHome } = await import(path.join(ROOT, 'src/host/core/pomasa-home.js'))
const { apply } = await import(path.join(ROOT, 'src/host/apply.js'))

/* ---------------- mini runner ---------------- */
let passed = 0
let failed = 0
const tests = []
const test = (name, fn) => tests.push([name, fn])

async function main() {
  for (const [name, fn] of tests) {
    try {
      await fn()
      passed += 1
      console.log(`  ok  ${name}`)
    } catch (err) {
      failed += 1
      console.error(`FAIL  ${name}`)
      console.error((err.stack || String(err)).split('\n').slice(0, 4).join('\n      '))
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed ? 1 : 0)
}

/* ---------------- helpers ---------------- */
function tempHome(prefix = 'pomasa-test-') {
  // realpath so it matches what pomasaHome(config) returns (macOS /tmp /var
  // are symlinked); path-equality assertions in the workspace tests depend on it
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)))
}

const SINGLE_DESCRIPTOR = {
  schema_version: 'obv-1',
  mas_id: 'demo',
  name: 'Demo MAS',
  work: { mode: 'single' },
  stages: [
    {
      index: 1,
      id: 'overview',
      title: 'Overview',
      agent_file: 'agents/01.overview.md',
      kind: 'stage',
      contracts: [
        {
          artifact: 'overview',
          shape: 'single-file',
          format: 'markdown',
          path_glob: '01.overview/overview.md',
          index_path: '01.overview/index.json',
          schema: ['id', 'title', 'summary', 'file'],
        },
      ],
    },
    {
      index: 2,
      id: 'research',
      title: 'Research',
      agent_file: 'agents/02.research.md',
      kind: 'stage',
      contracts: [
        {
          artifact: 'findings',
          shape: 'vertical-list',
          format: 'markdown',
          path_glob: '02.research/*.md',
          index_path: '02.research/index.json',
          schema: ['id', 'title', 'summary', 'file'],
        },
      ],
    },
  ],
}

function writeMas(home, masId, descriptor, { run, files } = {}) {
  const root = path.join(home, masId)
  fs.mkdirSync(path.join(root, 'workspace', '01.overview'), { recursive: true })
  fs.mkdirSync(path.join(root, 'workspace', '02.research'), { recursive: true })
  fs.writeFileSync(path.join(root, 'pomasa.json'), JSON.stringify(descriptor, null, 2))
  if (run) fs.writeFileSync(path.join(root, 'workspace', 'run.json'), JSON.stringify(run, null, 2))
  for (const [file, content] of Object.entries(files || {})) {
    fs.writeFileSync(path.join(root, 'workspace', file), content)
  }
}

const SINGLE_RUN = {
  schema_version: 'obv-1',
  mas_id: 'demo',
  unit: null,
  status: 'running',
  stages: [
    { index: 1, id: 'overview', status: 'completed', started_at: 100, finished_at: 200 },
    { index: 2, id: 'research', status: 'active', started_at: 200, finished_at: null },
  ],
}

const SINGLE_FILES = {
  '01.overview/index.json': JSON.stringify([{ id: 'ov', title: 'Overview Doc', summary: 's', file: 'overview.md' }]),
  '01.overview/overview.md': '# Overview\n\nbody',
  '02.research/index.json': JSON.stringify([
    { id: 'r1', title: 'Finding A', file: 'a.md' },
    { id: 'r2', title: 'Finding B', file: 'b.md' },
  ]),
  '02.research/a.md': '# A',
  '02.research/b.md': '# B',
}

/* ================= L1: unit ================= */

test('L1 descriptor: alias tolerance (artifact vs id, agent vs agent_file)', () => {
  const home = tempHome()
  writeMas(home, 'demo', SINGLE_DESCRIPTOR)
  const d = loadDescriptor(path.join(home, 'demo'))
  assert.equal(d.id, 'demo')
  assert.equal(d.work.mode, 'single')
  assert.equal(d.stages.length, 2)
  assert.equal(d.stages[0].agent, 'agents/01.overview.md')
  assert.equal(d.stages[0].contracts[0].id, 'overview')
  assert.equal(d.stages[0].contracts[0].shape, 'single-file')
  assert.equal(d.stages[0].contracts[0].indexPath, '01.overview/index.json')
  // 'id' key also accepted
  const c = normalizeContract({ id: 'x', path_glob: 'g', index_path: 'i' })
  assert.equal(c.id, 'x')
  const c2 = normalizeContract({ id: 'x', pathGlob: 'g2', indexPath: 'i2' })
  assert.equal(c2.pathGlob, 'g2')
  assert.equal(c2.indexPath, 'i2')
})

test('L1 descriptor: missing file -> null', () => {
  const home = tempHome()
  assert.equal(loadDescriptor(path.join(home, 'nope')), null)
})

test('L1 descriptor: agent paths normalize (bare md, prefixed, prose -> null)', () => {
  const home = tempHome()
  writeMas(home, 'demo', {
    schema_version: 'pomasa-0.10',
    mas_id: 'demo',
    work: { mode: 'single' },
    stages: [
      { index: 1, id: 'scan', title: 'Scan', agent: '01.initial_scanner.md' },
      { index: 2, id: 'deep', title: 'Deep', agent_file: 'agents/02.deep.md' },
      { index: 3, id: 'report', title: 'Report', agent: 'orchestrator（执行 scripts/assemble_report.sh）' },
      { index: 4, id: 'scr', title: 'Script', agent: 'scripts/assemble_report.sh' },
    ],
  })
  const d = loadDescriptor(path.join(home, 'demo'))
  assert.equal(d.stages[0].agent, 'agents/01.initial_scanner.md')
  assert.equal(d.stages[1].agent, 'agents/02.deep.md')
  assert.equal(d.stages[2].agent, null) // prose is not a blueprint file
  assert.equal(d.stages[3].agent, null) // non-doc path is not a blueprint file
})

test('L1 units: single mode -> workspace root', () => {
  const home = tempHome()
  writeMas(home, 'demo', SINGLE_DESCRIPTOR)
  const d = loadDescriptor(path.join(home, 'demo'))
  const units = unitRoots({ pomasaHome: home }, d, 'demo')
  assert.equal(units.length, 1)
  assert.equal(units[0].key, null)
})

test('L1 units: multi mode + declared/enumerated', () => {
  const home = tempHome()
  const multi = {
    schema_version: 'obv-1',
    mas_id: 'idx',
    work: {
      mode: 'multi',
      dimensions: ['country'],
      units: ['brasil', 'chile'],
      units_index: 'units.json',
      unit_layout: 'workspace/{country}',
    },
    stages: [],
  }
  const root = path.join(home, 'idx')
  fs.mkdirSync(path.join(root, 'workspace', 'brasil'), { recursive: true })
  fs.writeFileSync(path.join(root, 'pomasa.json'), JSON.stringify(multi))
  fs.writeFileSync(path.join(root, 'workspace', 'brasil', 'run.json'), JSON.stringify({ status: 'running', stages: [] }))
  fs.writeFileSync(path.join(root, 'units.json'), JSON.stringify(['kenya', 'india']))
  const d = loadDescriptor(path.join(home, 'idx'))
  const listing = unitListing({ pomasaHome: home }, d, 'idx')
  const keys = listing.map((u) => u.key)
  assert.deepEqual(keys, ['brasil', 'chile', 'kenya', 'india'])
  const brasil = listing.find((u) => u.key === 'brasil')
  assert.equal(brasil.run, true) // has run.json
  assert.equal(brasil.planned, true)
  const kenya = listing.find((u) => u.key === 'kenya')
  assert.equal(kenya.run, false)
  assert.equal(kenya.planned, true)
})

test('L1 state: aggregates run.json timeline and index instances', () => {
  const home = tempHome()
  writeMas(home, 'demo', SINGLE_DESCRIPTOR, { run: SINGLE_RUN, files: SINGLE_FILES })
  const d = loadDescriptor(path.join(home, 'demo'))
  const st = unitState({ pomasaHome: home }, d, 'demo', null)
  assert.equal(st.found, true)
  assert.equal(st.run.status, 'running')
  const ov = st.stages[0]
  assert.equal(ov.status, 'completed')
  assert.equal(ov.artifactCount, 1)
  assert.equal(ov.contracts[0].index[0].title, 'Overview Doc')
  const rs = st.stages[1]
  assert.equal(rs.status, 'active')
  assert.equal(rs.artifactCount, 2)
  // waiting stage not in run.json and without index
  writeMas(home, 'demo', { ...SINGLE_DESCRIPTOR, stages: SINGLE_DESCRIPTOR.stages.slice(0, 1) })
  const d2 = loadDescriptor(path.join(home, 'demo'))
  const st2 = unitState({ pomasaHome: home }, d2, 'demo', null)
  assert.equal(st2.stages[0].status, 'completed')
  assert.equal(st2.run.status, 'running')
})

test('L1 artifact.read: honors unit-root guard', () => {
  const home = tempHome()
  writeMas(home, 'demo', SINGLE_DESCRIPTOR, { run: SINGLE_RUN, files: SINGLE_FILES })
  const a = readArtifact({ pomasaHome: home }, 'demo', null, '01.overview/overview.md')
  assert.equal(a.format, 'markdown')
  assert.match(a.content, /# Overview/)
  // guard scope = unit root: intra-root traversal resolves, escape is rejected
  const intra = readArtifact({ pomasaHome: home }, 'demo', null, '01.overview/../02.research/a.md')
  assert.match(intra.content, /# A$/)
  assert.throws(() => readArtifact({ pomasaHome: home }, 'demo', null, '../../../etc/passwd'), /escapes/)
})

test('L1 prompt: forces Markdown-only output', () => {
  const md = buildUserInput({ projectId: 'x', topic: 't', runMode: 'single' })
  assert.match(md, /Deliverable|输出格式/)
  assert.doesNotThrow(() => buildUserInput({ projectId: 'y', topic: 't', runMode: 'multi', runDimensions: 'country' }))
  const multiMd = buildUserInput({ projectId: 'z', topic: 't', runMode: 'multi', runUnits: ['a', 'b'] })
  assert.match(multiMd, /- a\n- b/)
})

/* ================= L2: host integration ================= */

function mockCtx() {
  const routes = new Map()
  const webServer = {
    register: ({ kind, path: p, handler }) => {
      routes.set(`${kind}:${p}`, handler)
      return () => routes.delete(`${kind}:${p}`)
    },
  }
  const agents = new Map()
  const agentLoop = {
    create: (id, options, extra) => {
      const agent = {
        id,
        options,
        extra,
        calls: [],
        followup(m) {
          this.calls.push(['followup', m])
        },
        cancel(w) {
          this.calls.push(['cancel', w])
        },
      }
      agents.set(id, agent)
      return agent
    },
  }
  const agentsMap = new Map()
  const agentRegistry = {
    create: async ({ sessionId, meta, agentOptions }) => {
      const agent = {
        id: sessionId,
        meta,
        agentOptions,
        status: 'running', // DSH agent status — the authoritative liveness signal
        calls: [],
        followup(m) { this.calls.push(['followup', m]) },
        cancel(w) { this.calls.push(['cancel', w]) },
      }
      agentsMap.set(sessionId, agent)
      return { agent }
    },
    get: (id) => agentsMap.get(id) || null,
  }
  // Mirrors the real host registry shape: resolveByPath/create return plain
  // workspace VIEWS, while get(id) returns the registry OBJECT that carries the
  // methods (insertSessionBefore/setTitle) — apiproxy resolves via get().
  const wsSeq = { n: 0 }
  const wsObjects = new Map() // id -> object
  const wsViewsByCwd = new Map() // cwd -> view
  const wsObjectByCwd = new Map() // cwd -> object (what the tests assert)
  const workspaceRegistry = {
    resolveByPath: async (cwd) => wsViewsByCwd.get(cwd) || null,
    create: async (cwd) => {
      wsSeq.n += 1
      const id = `ws-${wsSeq.n}`
      const object = {
        cwd,
        id,
        title: null,
        sessions: [],
        setTitle(t) { this.title = t },
        attachSession(s) { this.sessions.push(s) },
        insertSessionBefore(s) { this.sessions.push(s) },
      }
      wsObjects.set(id, object)
      wsViewsByCwd.set(cwd, { cwd, id, workspaceId: id, title: null })
      wsObjectByCwd.set(cwd, object)
      return wsViewsByCwd.get(cwd)
    },
    get: (id) => wsObjects.get(id) || null,
    rename: async (id, title) => { const o = wsObjects.get(id); if (o) o.title = title; return o },
  }
  // the host exposes the registry as a DIRECT ctx property (ctx.workspaceRegistry)
  const ctx = {
    get: (k) => ({ webServer, agentLoop, agents: agentRegistry, agentDefaultModel: { currentSelection: () => ({ provider: 'mock', model: 'mock-model' }) }, workspaceRegistry }[k]),
    workspaceRegistry,
  }
  return { ctx, routes, agents: agentsMap, agentLoop, agentRegistry, workspaces: wsObjectByCwd }
}

function mockRes() {
  const r = { writeHead(code, h) { this.code = code; this.headers = h }, end(body) { this.body = body } }
  return r
}

async function call(routes, url, method = 'GET', body) {
  const pathOnly = url.split('?')[0]
  const handler = routes.get(`exact:${pathOnly}`)
  assert.ok(handler, `no route for ${pathOnly}`)
  const req = { url, method }
  req[Symbol.asyncIterator] = async function* () {
    if (body !== undefined) yield JSON.stringify(body)
  }
  const res = mockRes()
  await handler(req, res)
  return { code: res.code, json: res.body ? JSON.parse(res.body) : null }
}

test('L1 pomasa home: template is copied in, but existing files are kept', () => {
  const home = tempHome()
  assert.equal(fs.existsSync(templatePomasaHome()), true, 'pomasa-home/ template must exist')
  // fresh: AGENTS.md provisioned
  assert.equal(ensurePomasaHome({ pomasaHome: home }), true)
  assert.ok(fs.existsSync(path.join(home, 'AGENTS.md')))
  // user file wins: modify, then run again, must not be overwritten
  fs.writeFileSync(path.join(home, 'AGENTS.md'), '# 我的自定义约定\n', 'utf8')
  ensurePomasaHome({ pomasaHome: home })
  assert.equal(fs.readFileSync(path.join(home, 'AGENTS.md'), 'utf8'), '# 我的自定义约定\n')
})

test('L2 lifecycle: create prepares a prompt; /record drives generating; completion flips to completed', async () => {
  const home = tempHome()
  const { ctx, routes, agents } = mockCtx()
  apply(ctx, { pomasaHome: home })
  await assert.doesNotReject(() => call(routes, '/pomasa/mas.list'))
  const created = await call(routes, '/pomasa/mas.create', 'POST', { projectId: 'demo2', name: 'Demo 2', topic: 'test topic' })
  assert.equal(created.code, 200)
  assert.equal(created.json.ok, true)
  assert.equal(created.json.masId, 'demo2')
  // host only prepares the generation: no agent session is created — the CLIENT
  // creates the workspace-accounted session and drives it by sessions.prompt
  assert.equal(created.json.generation, 'client')
  assert.match(created.json.prompt, /SKILL.md/)
  assert.match(created.json.prompt, /demo2/)
  assert.equal([...agents.values()].filter((a) => String(a.id).startsWith('pomasa-gen-')).length, 0, 'no host agent session')
  // user_input.md written, markdown only
  const ui = fs.readFileSync(path.join(home, 'demo2', 'user_input.md'), 'utf8')
  assert.match(ui, /Research Topic/)
  // the client records the generation session; a live agent => generating
  await call(routes, '/pomasa/record', 'POST', { masId: 'demo2', kind: 'gen', sessionId: 'gen-1' })
  agents.set('gen-1', { id: 'gen-1', status: 'running' })
  let st = await call(routes, '/pomasa/generation.status?masId=demo2')
  assert.equal(st.json.status, 'generating')
  // agent ends without completing => failed
  agents.get('gen-1').status = 'ended'
  st = await call(routes, '/pomasa/generation.status?masId=demo2')
  assert.equal(st.json.status, 'failed')
  // generation completes on disk
  fs.writeFileSync(path.join(home, 'demo2', 'pomasa.json'), JSON.stringify(SINGLE_DESCRIPTOR))
  fs.mkdirSync(path.join(home, 'demo2', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(home, 'demo2', 'agents', '01.overview.md'), '# o')
  fs.writeFileSync(path.join(home, 'demo2', 'agents', '02.research.md'), '# r')
  st = await call(routes, '/pomasa/generation.status?masId=demo2')
  assert.equal(st.json.status, 'completed')
  const list = await call(routes, '/pomasa/mas.list')
  const demo2 = list.json.mas.find((m) => m.id === 'demo2')
  assert.equal(demo2.status, 'idle')
  assert.equal(demo2.unitCount, 1) // single mode: one unit (the workspace root)
})

test('L2 lifecycle: unit state + artifact read + traversal guard', async () => {
  const home = tempHome()
  const { ctx, routes } = mockCtx()
  apply(ctx, { pomasaHome: home })
  fs.mkdirSync(path.join(home, 'demo', 'workspace'), { recursive: true })
  writeMas(home, 'demo', SINGLE_DESCRIPTOR, { run: SINGLE_RUN, files: SINGLE_FILES })

  const st = await call(routes, '/pomasa/unit.state?masId=demo')
  assert.equal(st.json.ok, true)
  assert.equal(st.json.run.status, 'running')
  assert.equal(st.json.stages.length, 2)
  assert.equal(st.json.stages[0].artifactCount, 1)
  assert.equal(st.json.stages[1].artifactCount, 2)

  const art = await call(routes, '/pomasa/artifact.read?masId=demo&path=01.overview/overview.md')
  assert.equal(art.json.ok, true)
  assert.equal(art.json.format, 'markdown')
  assert.match(art.json.content, /# Overview/)

  const evil = await call(routes, `/pomasa/artifact.read?masId=demo&path=${encodeURIComponent('../../evil')}`)
  assert.equal(evil.json.ok, false)
  assert.match(evil.json.error, /escapes/)

  const missing = await call(routes, '/pomasa/artifact.read?masId=ghost&path=x')
  assert.equal(missing.code, 404)
})

test('L2 lifecycle: run.start prepares the prompt; /record tracks the run session', async () => {
  const home = tempHome()
  const { ctx, routes, agents } = mockCtx()
  apply(ctx, { pomasaHome: home })
  writeMas(home, 'demo', SINGLE_DESCRIPTOR)
  fs.mkdirSync(path.join(home, 'demo', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(home, 'demo', 'agents', '01.overview.md'), '# o')
  fs.writeFileSync(path.join(home, 'demo', 'agents', '02.research.md'), '# r')

  const bad = await call(routes, '/pomasa/run.start', 'POST', { masId: 'nosuch' })
  assert.equal(bad.json.ok, false)

  const started = await call(routes, '/pomasa/run.start', 'POST', { masId: 'demo' })
  assert.equal(started.json.ok, true)
  assert.equal(started.json.unitKey, null)
  assert.match(started.json.prompt, /00\.orchestrator\.md/)
  assert.match(started.json.prompt, /workspace/)
  // no host agent session is created
  assert.equal([...agents.values()].filter((a) => String(a.id).startsWith('pomasa-run-')).length, 0, 'no host run agent')
  // the client records the run session; a live agent => running
  await call(routes, '/pomasa/record', 'POST', { masId: 'demo', kind: 'run', unit: 'single', sessionId: 'run-1' })
  agents.set('run-1', { id: 'run-1', status: 'running' })
  const list1 = await call(routes, '/pomasa/mas.list')
  assert.equal(list1.json.mas.find((m) => m.id === 'demo').status, 'running')
  // agent dies with no run.json written => the record alone leaves it idle
  agents.get('run-1').status = 'ended'
  const list2 = await call(routes, '/pomasa/mas.list')
  assert.equal(list2.json.mas.find((m) => m.id === 'demo').status, 'idle')
})

test('L2 workspaces: the POMASA workspace is provisioned; /record stores run sessions', async () => {
  const home = tempHome()
  const { ctx, routes, workspaces } = mockCtx()
  apply(ctx, { pomasaHome: home })
  await new Promise((r) => setTimeout(r, 60)) // ensurePomasaWorkspace provisions asynchronously
  assert.equal(workspaces.size, 1)
  const [ws] = [...workspaces.values()]
  assert.equal(ws.title, 'POMASA')
  assert.equal(ws.cwd, home)
  fs.mkdirSync(path.join(home, 'wstest'), { recursive: true })
  await call(routes, '/pomasa/record', 'POST', { masId: 'wstest', kind: 'run', unit: 'single', sessionId: 'run-1' })
  await call(routes, '/pomasa/record', 'POST', { masId: 'wstest', kind: 'gen', sessionId: 'gen-1' })
  const reg = JSON.parse(fs.readFileSync(path.join(home, 'registry.json'), 'utf8'))
  const m = reg.mas.find((x) => x.id === 'wstest')
  assert.equal(m.lastRunSessionIds.single, 'run-1')
  assert.equal(m.lastGenSessionId, 'gen-1')
})

test('L2 status machine: session-lifecycle states + single-run guard', async () => {
  const home = tempHome()
  const { ctx, routes, agents } = mockCtx()
  apply(ctx, { pomasaHome: home })
  fs.writeFileSync(path.join(home, 'registry.json'), JSON.stringify({
    version: 1,
    mas: [
      { id: 'mas-a', name: 'a' },
      { id: 'mas-b', name: 'b' },
      { id: 'mas-c', name: 'c', status: 'generating', lastGenSessionId: 'pomasa-gen-1-000' },
    ],
  }))
  // mas-a: generated + run.json completed -> completed
  writeMas(home, 'mas-a', SINGLE_DESCRIPTOR, { run: { schema_version: 'obv-1', mas_id: 'mas-a', status: 'completed', stages: [] } })
  // mas-b: generated + run.json mid-run with a dead record -> run-failed
  writeMas(home, 'mas-b', SINGLE_DESCRIPTOR, { run: { schema_version: 'obv-1', mas_id: 'mas-b', status: 'running', stages: [] } })
  // mas-c: attempted generation, not complete, session gone -> gen-failed
  writeMas(home, 'mas-c', SINGLE_DESCRIPTOR)
  for (const id of ['mas-a', 'mas-b']) {
    fs.mkdirSync(path.join(home, id, 'agents'), { recursive: true })
    fs.writeFileSync(path.join(home, id, 'agents', '01.overview.md'), '# o')
    fs.writeFileSync(path.join(home, id, 'agents', '02.research.md'), '# r')
  }
  const status = async (id) => (await call(routes, '/pomasa/mas.list')).json.mas.find((m) => m.id === id).status
  assert.equal(await status('mas-a'), 'completed')
  assert.equal(await status('mas-b'), 'run-failed')
  assert.equal(await status('mas-c'), 'gen-failed')
  // single active run: recorded live run session blocks a second run.start
  await call(routes, '/pomasa/record', 'POST', { masId: 'mas-a', kind: 'run', unit: 'single', sessionId: 'a-run' })
  agents.set('a-run', { id: 'a-run', status: 'running' })
  assert.equal(await status('mas-a'), 'running')
  const twice = await call(routes, '/pomasa/run.start', 'POST', { masId: 'mas-a' })
  assert.equal(twice.json.ok, false)
  assert.match(twice.json.error, /运行/)
  // also refused while a generation session is live
  await call(routes, '/pomasa/record', 'POST', { masId: 'mas-c', kind: 'gen', sessionId: 'c-gen' })
  agents.set('c-gen', { id: 'c-gen', status: 'running' })
  const guarded = await call(routes, '/pomasa/run.start', 'POST', { masId: 'mas-c' })
  assert.equal(guarded.json.ok, false)
  assert.match(guarded.json.error, /生成/)
  // one run = one unit: multi run.start with several units is refused
  const multi = { schema_version: 'obv-1', mas_id: 'idx', work: { mode: 'multi', dimensions: ['country'] }, stages: [] }
  writeMas(home, 'idx', multi)
  fs.mkdirSync(path.join(home, 'idx', 'workspace', 'brasil'), { recursive: true })
  fs.mkdirSync(path.join(home, 'idx', 'workspace', 'india'), { recursive: true })
  fs.writeFileSync(path.join(home, 'idx', 'workspace', 'brasil', 'run.json'), JSON.stringify({ status: 'completed', stages: [] }))
  const multiStart = await call(routes, '/pomasa/run.start', 'POST', { masId: 'idx', units: ['brasil', 'india'] })
  assert.equal(multiStart.json.ok, false)
  assert.match(multiStart.json.error, /一个单元|一个运行/)
  const oneStart = await call(routes, '/pomasa/run.start', 'POST', { masId: 'idx', units: ['india'] })
  assert.equal(oneStart.json.ok, true)
  // authoritative liveness: the agent registry decides, not run.json
  agents.get('a-run').status = 'ended'
  assert.equal(await status('mas-a'), 'completed') // completed run.json stays completed
  const deadReg = JSON.parse(fs.readFileSync(path.join(home, 'registry.json'), 'utf8'))
  deadReg.mas.push({ id: 'mas-d', name: 'd', lastRunSessionIds: { single: 'pomasa-run-gone' } })
  fs.writeFileSync(path.join(home, 'registry.json'), JSON.stringify(deadReg))
  writeMas(home, 'mas-d', SINGLE_DESCRIPTOR, { run: { schema_version: 'obv-1', mas_id: 'mas-d', status: 'running', stages: [] } })
  fs.mkdirSync(path.join(home, 'mas-d', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(home, 'mas-d', 'agents', '01.overview.md'), '# o')
  fs.writeFileSync(path.join(home, 'mas-d', 'agents', '02.research.md'), '# r')
  assert.equal(await status('mas-d'), 'run-failed')
})

test('L2 generated: generator descriptor shape (bare agents + prose orchestrator) completes', async () => {
  const home = tempHome()
  const { ctx, routes } = mockCtx()
  apply(ctx, { pomasaHome: home })
  // This is the exact shape the real generator emits for 黑神话·钟馗: bare
  // .md stage agents plus one stage whose agent is a prose orchestrator note.
  writeMas(home, 'zhongkui', {
    schema_version: 'pomasa-0.10',
    mas_id: 'zhongkui',
    work: { mode: 'single' },
    stages: [
      { index: 1, id: 'scan', title: 'Scan', agent: '01.initial_scanner.md', contracts: [] },
      { index: 2, id: 'report', title: 'Report', agent: 'orchestrator（执行 scripts/assemble_report.sh）', contracts: [] },
    ],
  })
  fs.mkdirSync(path.join(home, 'zhongkui', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(home, 'zhongkui', 'agents', '01.initial_scanner.md'), '# scan')
  fs.writeFileSync(path.join(home, 'registry.json'), JSON.stringify({ version: 1, mas: [{ id: 'zhongkui', name: 'z', status: 'generating', lastGenSessionId: 'pomasa-gen-1-0' }] }))
  const get = await call(routes, '/pomasa/mas.get?masId=zhongkui')
  assert.equal(get.json.generated, true)
  const list = await call(routes, '/pomasa/mas.list')
  assert.equal(list.json.mas.find((m) => m.id === 'zhongkui').status, 'idle')
})

test('L2 safety: generate requires topic, rejects dup ids', async () => {
  const home = tempHome()
  const { ctx, routes } = mockCtx()
  apply(ctx, { pomasaHome: home })
  const noTopic = await call(routes, '/pomasa/mas.create', 'POST', { projectId: 'x' })
  assert.equal(noTopic.json.ok, false)
  const noId = await call(routes, '/pomasa/mas.create', 'POST', { topic: 't' })
  assert.equal(noId.json.ok, false)
  await call(routes, '/pomasa/mas.create', 'POST', { projectId: 'dup', topic: 't' })
  const dup = await call(routes, '/pomasa/mas.create', 'POST', { projectId: 'dup', topic: 't' })
  assert.equal(dup.json.ok, false)
  assert.match(dup.json.error, /exists/)
})

test('L2 client bundle: loads and registers conversation.view + sidebar entry', () => {
  const bundlePath = path.join(ROOT, 'lib/client.js')
  assert.ok(fs.existsSync(bundlePath), 'lib/client.js missing — run npm run build:client first')
  const src = fs.readFileSync(bundlePath, 'utf8')
  // CSS ships as a JS template literal; a stray backtick inside CSS would
  // terminate it early and silently strip every later rule. Guard the source
  // (exactly one backtick pair) and that the built bundle still ends with the
  // last rule.
  const stylesSrc = fs.readFileSync(path.join(ROOT, 'src/client/styles.js'), 'utf8')
  assert.match(stylesSrc, /export const CSS = `/)
  assert.equal(stylesSrc.split('`').length, 3, 'styles.js CSS template must contain exactly one backtick pair')
  assert.match(src, /const CSS = `/)
  assert.match(src, /@media \(max-width: 820px\)/)
  assert.match(src, /\.ps-shell-panel/)
  const registrations = []
  const loaded = []
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(cfg) {
          loaded.push(cfg.id)
          const React = { createElement: (type, props, ...kids) => ({ type, props, kids }), Component: class {} }
          const mod = cfg.factory((name) => {
            if (name === 'react') return React
            throw new Error('unexpected require: ' + name)
          })
          const expectedSlots = ['sidebar.footer.action', 'shell.overlay']
          const vc = {
            inject(slotName, factory) {
              assert.equal(slotName, expectedSlots.shift())
              assert.equal(typeof factory(), 'function', 'inject factory must return a dispose fn')
            },
            register(def, render) {
              registrations.push(def)
              assert.ok(render({ sessionId: 's-1' }), 'render must return an element')
              return () => {}
            },
          }
          mod.apply({ get: (k) => (k === 'slots' ? vc : undefined) })
        },
      },
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(src, sandbox)
  assert.deepEqual(loaded, ['pomasa-studio'])
  assert.equal(registrations.length, 2)
  assert.equal(registrations[0].id, 'pomasa-studio')
  assert.ok(registrations.some((r) => r.name === 'sidebar.footer.action'))
  assert.ok(registrations.some((r) => r.name === 'shell.overlay'))
  assert.ok(!registrations.some((r) => r.name === 'conversation.view'), 'the in-session tab was removed')
})

async function findPnpmReact() {
  const pnpm = path.join(ROOT, '..', 'deepseek-harness', 'node_modules', '.pnpm')
  if (!fs.existsSync(pnpm)) return null
  const reactDir = fs.readdirSync(pnpm).find((d) => /^react@\d/.test(d))
  const reactDomDir = fs.readdirSync(pnpm).find((d) => d.startsWith('react-dom@'))
  if (!reactDir || !reactDomDir) return null
  const base = 'file://' + pnpm + '/'
  const React = (await import(base + reactDir + '/node_modules/react/index.js')).default
  const ReactDOMServer = (await import(base + reactDomDir + '/node_modules/react-dom/server.js')).default
  return { React, SSR: ReactDOMServer }
}

function buildClientSource(names) {
  const strip = (src) => src
    .replace(/^export const inject = .*$/m, '')
    .replace(/^export function apply/m, 'function apply')
    .replace(/^export function /gm, 'function ')
    .replace(/^export const /gm, 'const ')
    .replace(/^export \{[^}]+\}\s*;?\s*$/gm, '')
    .replace(/^import .+ from .+;?\s*$/gm, '')
  return names.map((n) => strip(fs.readFileSync(path.join(ROOT, 'src/client', n), 'utf8'))).join('\n')
}

test('L2 client renders with real React (guards positional-children bugs)', async () => {
  const react = await findPnpmReact()
  if (!react) {
    console.log('    (skip: react not found under ../deepseek-harness .pnpm)')
    return
  }
  const src = buildClientSource(['api.js', 'md.js', 'components.js', 'pages.js']) +
    '\nglobalThis.__ps = { MasList, CreateMas, MasDetail, renderMarkdown, psEmpty, stageContractCards };'
  const ctx = vm.createContext({ React: react.React, window: {}, URL, setTimeout, clearTimeout })
  vm.runInContext('var h = React.createElement;\n' + src, ctx)
  const ps = ctx.__ps
  const api = { listMas: () => Promise.resolve({ ok: true, mas: [] }) }

  const listHtml = react.SSR.renderToString(react.React.createElement(ps.MasList, { api, onCreate: () => {}, onOpen: () => {}, onListChange: () => {} }))
  assert.match(listHtml, /POMASA Studio/)
  assert.match(listHtml, /全部研究 MAS 的全局工作台/)
  // the create entry always lives in the nav head (left), never in the right pane
  assert.match(listHtml, /新建 MAS/)
  assert.match(listHtml, /<button/)
  assert.match(listHtml, /加载中/)

  const createHtml = react.SSR.renderToString(react.React.createElement(ps.CreateMas, { api, onCancel: () => {}, onDone: () => {} }))
  assert.match(createHtml, /研究主题与核心问题/)
  assert.match(createHtml, /生成 MAS/)
  assert.match(createHtml, /运行方式/)

  const mdHtml = react.SSR.renderToString(react.React.createElement('div', { key: 'd' },
    ps.renderMarkdown('# 标题\n\n**加粗** `代码` [链接](https://example.com)\n\n- a\n- b\n\n```js\nvar x = 1\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |'),
  ))
  assert.match(mdHtml, /<h1>标题<\/h1>/)
  assert.match(mdHtml, /<strong>加粗<\/strong>/)
  assert.match(mdHtml, /<a href="https:\/\/example.com"/)
  assert.match(mdHtml, /<ul>.*<li>a<\/li>/m)
  assert.match(mdHtml, /<pre class="ps-pre">/)
  assert.match(mdHtml, /<table>.*<th>A<\/th>/m)
  assert.match(mdHtml, /<th>B<\/th>/)

  // Regression: psEmpty invoked via createElement without a hint must not
  // render the empty-object phantom React passes as the 2nd arg (error #31).
  const emptyHtml = react.SSR.renderToString(react.React.createElement(ps.psEmpty, { title: '空状态' }))
  assert.match(emptyHtml, /ps-empty-title/)
  assert.match(emptyHtml, /空状态/)
  assert.doesNotThrow(() => react.SSR.renderToString(react.React.createElement(ps.psEmpty, { title: 'x', hint: 'y' })))

  // Regression: two contracts sharing one index.json must not duplicate entries
  const shared = {
    status: 'completed',
    contracts: [
      { id: 'scan_overview', title: '概览', shape: 'single-file', indexPath: '01.scan/index.json', index: [{ id: 'scan_overview', title: 'POMASA 初始概览', file: '01.scan/overview.md' }] },
      { id: 'question_list', title: '问题清单', shape: 'single-file', indexPath: '01.scan/index.json', index: [{ id: 'question_list', title: '问题清单', file: '01.scan/question_list.md' }] },
    ],
  }
  const dupHtml = react.SSR.renderToString(react.React.createElement('div', { key: 'd' },
    ps.stageContractCards({ status: 'completed', contracts: shared.contracts }, null, {}, () => {}),
  ))
  assert.equal((dupHtml.match(/<div class="ps-art-title">POMASA 初始概览<\/div>/g) || []).length, 1)
  assert.equal((dupHtml.match(/<div class="ps-art-title">问题清单<\/div>/g) || []).length, 1)
  assert.equal((dupHtml.match(/class="ps-card ps-art"/g) || []).length, 2)
})

test('L2 lifecycle: mas.delete removes dir, registry, and active sessions', async () => {
  const home = tempHome()
  const { ctx, routes, agents } = mockCtx()
  apply(ctx, { pomasaHome: home })
  await call(routes, '/pomasa/mas.create', 'POST', { projectId: 'gone', topic: 't' })
  const regBefore = JSON.parse(fs.readFileSync(path.join(home, 'registry.json'), 'utf8'))
  assert.ok(regBefore.mas.some((m) => m.id === 'gone'))
  const del = await call(routes, '/pomasa/mas.delete', 'POST', { masId: 'gone' })
  assert.equal(del.code, 200)
  assert.equal(del.json.ok, true)
  assert.equal(fs.existsSync(path.join(home, 'gone')), false)
  const gone = await call(routes, '/pomasa/generation.status?masId=gone')
  assert.equal(gone.code, 404)
  const list = await call(routes, '/pomasa/mas.list')
  assert.ok(!list.json.mas.some((m) => m.id === 'gone'))
  const ghost = await call(routes, '/pomasa/mas.delete', 'POST', { masId: 'nope' })
  assert.equal(ghost.code, 404)
})

test('L2 blueprint.read: reads within MAS root, rejects escapes', async () => {
  const home = tempHome()
  const { ctx, routes } = mockCtx()
  apply(ctx, { pomasaHome: home })
  await call(routes, '/pomasa/mas.create', 'POST', { projectId: 'bp', topic: 't' })
  fs.mkdirSync(path.join(home, 'bp', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(home, 'bp', 'agents', '00.orchestrator.md'), '# Orchestrator\n\nblueprint body')
  const ok = await call(routes, '/pomasa/blueprint.read?masId=bp&path=agents/00.orchestrator.md')
  assert.equal(ok.code, 200)
  assert.match(ok.json.content, /blueprint body/)
  const esc = await call(routes, `/pomasa/blueprint.read?masId=bp&path=${encodeURIComponent('../../outside')}`)
  assert.equal(esc.code, 400)
  assert.match(esc.json.error, /escapes/)
  const miss = await call(routes, '/pomasa/blueprint.read?masId=bp&path=agents/nope.md')
  assert.equal(miss.code, 404)
  // fallback: declared agent path missing -> resolve by stage index from agents/
  fs.writeFileSync(path.join(home, 'bp', 'agents', '01.overview.md'), '# 概览蓝图')
  const fb = await call(routes, '/pomasa/blueprint.read?masId=bp&path=agents/unlinked.md&stage=1')
  assert.equal(fb.code, 200)
  assert.match(fb.json.content, /概览蓝图/)
})

await main()