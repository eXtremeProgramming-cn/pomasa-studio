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
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
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
  fs.mkdirSync(path.join(root, '01.overview'), { recursive: true })
  fs.mkdirSync(path.join(root, '02.research'), { recursive: true })
  fs.writeFileSync(path.join(root, 'pomasa.json'), JSON.stringify(descriptor, null, 2))
  if (run) fs.writeFileSync(path.join(root, 'run.json'), JSON.stringify(run, null, 2))
  for (const [file, content] of Object.entries(files || {})) {
    fs.writeFileSync(path.join(root, file), content)
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
  fs.mkdirSync(path.join(root, 'brasil'), { recursive: true })
  fs.writeFileSync(path.join(root, 'pomasa.json'), JSON.stringify(multi))
  fs.writeFileSync(path.join(root, 'brasil', 'run.json'), JSON.stringify({ status: 'running', stages: [] }))
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
        calls: [],
        followup(m) { this.calls.push(['followup', m]) },
        cancel(w) { this.calls.push(['cancel', w]) },
      }
      agentsMap.set(sessionId, agent)
      return { agent }
    },
  }
  const ctx = { get: (k) => ({ webServer, agentLoop, agents: agentRegistry, agentDefaultModel: { currentSelection: () => ({ provider: 'mock', model: 'mock-model' }) } }[k]) }
  return { ctx, routes, agents: agentsMap, agentLoop, agentRegistry }
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

test('L2 lifecycle: create -> generating -> completed', async () => {
  const home = tempHome()
  const { ctx, routes, agents } = mockCtx()
  apply(ctx, { pomasaHome: home })
  await assert.doesNotReject(() => call(routes, '/pomasa/mas.list'))
  const created = await call(routes, '/pomasa/mas.create', 'POST', { projectId: 'demo2', name: 'Demo 2', topic: 'test topic' })
  assert.equal(created.code, 200)
  assert.equal(created.json.ok, true)
  assert.equal(created.json.masId, 'demo2')
  assert.equal(created.json.generation, 'session')
  const genAgent = [...agents.values()].find((a) => String(a.id).startsWith('pomasa-gen-'))
  assert.ok(genAgent)
  assert.equal(genAgent.calls[0][0], 'followup')
  assert.match(genAgent.calls[0][1].content[0].text, /SKILL.md/)
  assert.match(genAgent.calls[0][1].content[0].text, /demo2/)
  // user_input.md written, markdown only
  const ui = fs.readFileSync(path.join(home, 'demo2', 'user_input.md'), 'utf8')
  assert.match(ui, /Research Topic/)

  let st = await call(routes, '/pomasa/generation.status?masId=demo2')
  assert.equal(st.json.status, 'generating')

  // simulate generation finishing: pomasa.json appears
  fs.writeFileSync(path.join(home, 'demo2', 'pomasa.json'), JSON.stringify(SINGLE_DESCRIPTOR))
  // completion also requires the referenced agent blueprints to exist
  fs.mkdirSync(path.join(home, 'demo2', 'agents'), { recursive: true })
  fs.writeFileSync(path.join(home, 'demo2', 'agents', '01.overview.md'), '# o')
  fs.writeFileSync(path.join(home, 'demo2', 'agents', '02.research.md'), '# r')
  st = await call(routes, '/pomasa/generation.status?masId=demo2')
  assert.equal(st.json.status, 'completed')

  const list = await call(routes, '/pomasa/mas.list')
  const demo2 = list.json.mas.find((m) => m.id === 'demo2')
  assert.equal(demo2.status, 'idle')
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

test('L2 lifecycle: run.start spawns sessions, intervene/cancel route', async () => {
  const home = tempHome()
  const { ctx, routes, agents } = mockCtx()
  apply(ctx, { pomasaHome: home })
  writeMas(home, 'demo', SINGLE_DESCRIPTOR)

  const bad = await call(routes, '/pomasa/run.start', 'POST', { masId: 'nosuch' })
  assert.equal(bad.json.ok, false)

  const started = await call(routes, '/pomasa/run.start', 'POST', { masId: 'demo' })
  assert.equal(started.json.ok, true)
  assert.deepEqual(started.json.units, [null])
  const runAgent = [...agents.values()].find((a) => String(a.id).startsWith('pomasa-run-'))
  assert.ok(runAgent)
  assert.ok(runAgent)
  assert.match(runAgent.calls[0][1].content[0].text, /00\.orchestrator\.md/)
  assert.match(runAgent.calls[0][1].content[0].text, /run\.json/)

  const iv = await call(routes, '/pomasa/run.intervene', 'POST', { masId: 'demo', unit: null, message: '再搜一下背景' })
  assert.equal(iv.json.ok, true)
  assert.equal(runAgent.calls[1][1].content[0].text, '再搜一下背景')

  const can = await call(routes, '/pomasa/run.cancel', 'POST', { masId: 'demo', unit: null })
  assert.equal(can.json.ok, true)
  assert.equal(runAgent.calls[2][0], 'cancel')
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
          const expectedSlots = ['conversation.view', 'sidebar.footer.action']
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
  assert.equal(registrations[0].name, 'conversation.view')
  assert.ok(registrations.some((r) => r.name === 'sidebar.footer.action'))
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

  const listHtml = react.SSR.renderToString(react.React.createElement(ps.MasList, { api, onCreate: () => {}, onOpen: () => {} }))
  assert.match(listHtml, /POMASA Studio/)
  assert.match(listHtml, /新建 MAS/)
  assert.match(listHtml, /<button/)

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
  assert.ok([...agents.values()].some((a) => String(a.id).startsWith('pomasa-gen-')))
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