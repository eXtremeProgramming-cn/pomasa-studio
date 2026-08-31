// Three pages: MAS list, create form, MAS detail. Data flows through the host API only.
// str() guards every dynamic text node so a non-string value from index.json or
// run.json degrades to text instead of crashing the render tree.

// Trigger a browser download for a Blob produced by the host export endpoint.
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function str(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  try { return JSON.stringify(v) } catch { return String(v) }
}

// The full POMASA pattern catalog, so the researcher can see every switch and
// its necessity. Must patterns are locked on (the generator always applies
// them); recommended and optional ones are togglable. Bilingual here rather
// than in i18n keys: this is catalog content, not chrome copy.
const CATALOG_PATTERNS = [
  { id: 'COR-01', zh: '提示词定义的智能体', en: 'Prompt-Defined Agent', zhD: 'agent 即自然语言蓝图', enD: 'agents are natural-language blueprints', nec: 'must' },
  { id: 'COR-02', zh: '智能运行时', en: 'Intelligent Runtime', zhD: '运行时解释蓝图执行', enD: 'runtime interprets blueprints', nec: 'must' },
  { id: 'STR-01', zh: '参考数据配置', en: 'Reference Data Configuration', zhD: '领域知识与 agent 逻辑分离', enD: 'separate domain knowledge from agent logic', nec: 'must' },
  { id: 'STR-06', zh: '方法论指导', en: 'Methodological Guidance', zhD: '研究方法内嵌进蓝图', enD: 'embed research method in blueprints', nec: 'must' },
  { id: 'BHV-02', zh: '忠实智能体实例化', en: 'Faithful Agent Instantiation', zhD: '子代理严格按蓝图执行', enD: 'subagents follow their blueprint', nec: 'must' },
  { id: 'QUA-03', zh: '可验证数据溯源', en: 'Verifiable Data Lineage', zhD: '产物可回溯到来源', enD: 'outputs traceable to sources', nec: 'must' },
  { id: 'STR-02', zh: '文件系统数据总线', en: 'Filesystem Data Bus', zhD: '阶段间靠文件传数据', enD: 'stages exchange data via files', nec: 'recommended' },
  { id: 'STR-03', zh: '工作区隔离', en: 'Workspace Isolation', zhD: '运行沙箱彼此隔离', enD: 'isolated run sandboxes', nec: 'recommended' },
  { id: 'STR-04', zh: '业务驱动智能体设计', en: 'Business-Driven Agent Design', zhD: '按研究维度切分 agent', enD: 'split agents along research dimensions', nec: 'recommended' },
  { id: 'STR-05', zh: '可组合文档装配', en: 'Composable Document Assembly', zhD: '分节撰写后统一装配', enD: 'assemble report from sections', nec: 'recommended' },
  { id: 'STR-07', zh: '反向工程研究问题', en: 'Reverse-Engineered Research Questions', zhD: '从目标结论倒推研究问题', enD: 'derive questions from target conclusions', nec: 'recommended' },
  { id: 'STR-08', zh: 'Pandoc 就绪 Markdown', en: 'Pandoc-Ready Markdown', zhD: '脚注引注，输出可直接转换', enD: 'footnote citations, conversion-ready output', nec: 'recommended' },
  { id: 'STR-09', zh: '交付物导出管线', en: 'Deliverable Export Pipeline', zhD: '产出 DOCX/PDF 交付物', enD: 'export docx/pdf deliverables', nec: 'recommended' },
  { id: 'BHV-01', zh: '编排式智能体流水线', en: 'Orchestrated Agent Pipeline', zhD: '阶段流水线逐级推进', enD: 'stages advance through the pipeline', nec: 'recommended' },
  { id: 'BHV-05', zh: '扎实的网络研究', en: 'Grounded Web Research', zhD: '抓原文再引用，不轻信摘要', enD: 'fetch sources, never trust snippets', nec: 'recommended' },
  { id: 'QUA-01', zh: '内嵌质量标准', en: 'Embedded Quality Standards', zhD: '质量标准写进蓝图自检', enD: 'quality criteria embedded in blueprints', nec: 'recommended' },
  { id: 'BHV-03', zh: '并行实例执行', en: 'Parallel Instance Execution', zhD: '多单元并行批量运行', enD: 'run units concurrently in batches', nec: 'optional' },
  { id: 'BHV-04', zh: '渐进式数据精炼', en: 'Progressive Data Refinement', zhD: '同一产物多轮迭代改进', enD: 'iterate on the same outputs across passes', nec: 'optional' },
  { id: 'BHV-06', zh: '可配置工具绑定', en: 'Configurable Tool Binding', zhD: '运行时按环境换工具', enD: 'swap tools per runtime environment', nec: 'optional' },
  { id: 'QUA-02', zh: '分层质量保障', en: 'Layered Quality Assurance', zhD: '多阶段交叉校验', enD: 'cross-check across stages', nec: 'optional' },
]

function MasList(props) {
  const api = props.api
  const [mas, setMas] = React.useState(null)
  const [error, setError] = React.useState(null)

  const refresh = React.useCallback(() => {
    api.listMas()
      .then((r) => {
        if (r.ok) {
          setMas(r.mas)
          setError(null)
          if (props.onListChange) props.onListChange(r.mas.length)
        } else setError(r.error)
      })
      .catch((e) => setError(String(e && e.message || e)))
  }, [api])

  React.useEffect(() => {
    refresh()
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [refresh])

  return h('div', { className: 'ps-nav' },
    h('div', { className: 'ps-nav-head' },
      h('div', { className: 'ps-nav-title' },
        h('span', { className: 'name' }, t('studio.title')),
        // the create entry lives here, on the left — the right pane never
        // carries its own "新建 MAS" button
        h(psBtn, { primary: true, style: { padding: '5px 12px', fontSize: 13.5 }, onClick: props.onCreate }, t('new.mas')),
      ),
      h('div', { className: 'ps-sub' }, t('studio.tagline')),
    ),
    error ? h('div', { className: 'ps-notice err', style: { margin: 10 } }, error) : null,
    h('div', { className: 'ps-nav-scroll' },
      mas === null ? h('div', { className: 'ps-muted', style: { padding: '20px 12px' } }, t('loading')) :
      mas.length === 0 ?
        h('div', { className: 'ps-nav-empty' }, t('nav.empty')) :
        mas.map((m) =>
          h('div', { key: m.id, className: 'ps-nav-row' + (props.selectedId === m.id ? ' on' : ''), onClick: () => props.onSelect(m.id) },
            h('div', { className: 'ps-nav-top' },
              h('span', { className: 'ps-dot ' + (MAS_STATUS_BADGE[m.status] || 'idle') }),
              h('span', { className: 'ps-nav-name' }, str(m.name || m.id)),
              h(psBtn, {
                ghost: true,
                className: 'ps-btn-danger ps-nav-del',
                title: t('delete.tip'),
                onClick: (e) => {
                  e.stopPropagation()
                  const name = str(m.name || m.id)
                  if (window.confirm(t('confirm.delete', { name, id: str(m.id) }))) {
                    api.deleteMas(m.id).then((r) => {
                      if (r && r.ok) { refresh(); if (props.onDelete) props.onDelete(m.id) }
                      else setError((r && r.error) || t('delete.failed'))
                    })
                  }
                },
              }, t('delete.mas')),
            ),
            h('div', { className: 'ps-nav-meta' },
              h('span', null, str(m.unitCount) + ' ' + t('unit.count')),
              h('span', null, m.lastRunAt ? t('last.run') + ' ' + fmtTime(m.lastRunAt) : t('not.run')),
            ),
          ),
        ),
    ),
    h(LangSwitch, null),
  )
}

function CreateMas(props) {
  const api = props.api
  const lang = useLang()
  const [f, setF] = React.useState(() => ({
    name: '', projectId: '', language: 'Chinese', reportLanguage: 'Chinese',
    topic: '', ideas: '', dataSources: t('create.default.dataSources'), refs: '',
    analysis: '', reportFormat: t('create.default.reportFormat'), reportStructure: '',
    runMode: 'single', runDimensions: '', runUnits: '',
    qaLevel: 'Standard', other: '',
  }))
  const [patterns, setPatterns] = React.useState([]) // selected optional patterns
  const [patternsOpen, setPatternsOpen] = React.useState(false)
  // The default values are Studio-provided text, so an untouched default follows
  // the UI language; once the user edits a field it is their content and stays.
  const langRef = React.useRef(lang)
  React.useEffect(() => {
    if (langRef.current === lang) return
    const prev = langRef.current
    langRef.current = lang
    setF((pf) => {
      const nf = Object.assign({}, pf)
      if (nf.dataSources === t('create.default.dataSources', null, prev)) nf.dataSources = t('create.default.dataSources')
      if (nf.reportFormat === t('create.default.reportFormat', null, prev)) nf.reportFormat = t('create.default.reportFormat')
      return nf
    })
  }, [lang])
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState(null)

  const set = (k) => (e) => setF((prev) => Object.assign({}, prev, { [k]: e.target.value }))

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const fields = Object.assign({}, f, {
        refs: f.refs.split('\n').map((s) => s.trim()).filter(Boolean),
        runUnits: f.runUnits.split('\n').map((s) => s.trim()).filter(Boolean),
        patterns: patterns.length
          ? CATALOG_PATTERNS.filter((x) => patterns.includes(x.id)).map((x) => x.id + ' ' + (lang === 'en' ? x.en : x.zh)).join('、')
          : '',
      })
      const r = await api.createMas(fields)
      if (!r.ok) { setError(r.error || t('create.failed')); return }
      if (r.generation === 'external') {
        setError(t('create.ext.error'))
        return
      }
      // direction-1: generation session is created by the client through the
      // workspace flow and driven by sessions.prompt, so the MAS shows under
      // the POMASA workspace
      if (r.generation === 'client' && props.onGeneration) {
        const d = await props.onGeneration(r.masId, r.prompt)
        if (!d.ok) setError(d.error || t('gen.start.failed'))
      }
      props.onDone(r.masId)
    } catch (e) {
      setError(String(e && e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return h('div', { className: 'ps-main' },
    h('div', { className: 'ps-main-inner' },
      h('div', { className: 'ps-info-bar' },
        h(psBtn, { ghost: true, onClick: () => props.onCancel() }, t('create.cancel')),
        h('h2', null, t('new.mas')),
      ),
      h('div', { className: 'ps-sub' }, t('create.subtitle')),
      error ? h('div', { className: 'ps-notice err' }, error) : null,

    h(psCard, null,
      h('div', { className: 'ps-form-row' },
        psField({ label: h('span', null, t('field.projectId'), h('span', { className: 'ps-req' }, ' *')) }, h(psInput, { value: f.projectId, onChange: set('projectId'), placeholder: t('ph.projectId') })),
        psField({ label: t('field.name') }, h(psInput, { value: f.name, onChange: set('name'), placeholder: t('ph.name') })),
      ),
      h('div', { className: 'ps-form-row' },
        psField({ label: t('field.language') }, h(psInput, { value: f.language, onChange: set('language') })),
        psField({ label: t('field.reportLanguage') }, h(psInput, { value: f.reportLanguage, onChange: set('reportLanguage') })),
      ),
      psField({ label: h('span', null, t('field.topic'), h('span', { className: 'ps-req' }, ' *')), hint: t('field.topic.hint') },
        h(psTextarea, { value: f.topic, onChange: set('topic'), placeholder: t('ph.topic') })),
      psField({ label: t('field.ideas') }, h(psTextarea, { value: f.ideas, onChange: set('ideas') })),
      psField({ label: t('field.refs') }, h(psTextarea, { value: f.refs, onChange: set('refs') })),
      psField({ label: t('field.analysis') }, h(psTextarea, { value: f.analysis, onChange: set('analysis') })),
      h('div', { className: 'ps-form-row' },
        psField({ label: t('field.dataSources') }, h(psInput, { value: f.dataSources, onChange: set('dataSources') })),
        psField({ label: t('field.reportFormat') }, h(psInput, { value: f.reportFormat, onChange: set('reportFormat') })),
      ),
      psField({ label: t('field.reportStructure') }, h(psTextarea, { value: f.reportStructure, onChange: set('reportStructure'), style: { minHeight: 96 } })),

      h('div', { className: 'ps-form-row' },
        psField({ label: t('field.runMode'), hint: t('field.runMode.hint') },
          h('select', { className: 'ps-select', value: f.runMode, onChange: set('runMode') },
            h('option', { value: 'single' }, t('runMode.single')),
            h('option', { value: 'multi' }, t('runMode.multi')),
          )),
        h('div', { className: 'ps-field h-nowrap' },
          h('label', null, t('field.runDimensions')),
          h(psInput, { value: f.runDimensions, onChange: set('runDimensions'), disabled: f.runMode !== 'multi' }),
        ),
      ),
      f.runMode === 'multi' ?
        psField({ label: t('field.runUnits') }, h(psTextarea, { value: f.runUnits, onChange: set('runUnits') })) : null,

      psField({ label: t('field.qaLevel') },
        h('select', { className: 'ps-select', value: f.qaLevel, onChange: set('qaLevel') },
          h('option', { value: 'Simple' }, t('qa.simple')),
          h('option', { value: 'Standard' }, t('qa.standard')),
          h('option', { value: 'Strict' }, t('qa.strict')),
        )),
      psField({ label: t('field.patterns') }, h('div', { className: 'ps-patterns-open' },
        h('div', { className: 'ps-patterns-summary' },
          patterns.length
            ? t('patterns.selected', { n: patterns.length }) + '：' + CATALOG_PATTERNS.filter((x) => patterns.includes(x.id)).map((x) => x.id).join('、')
            : t('patterns.none')),
        h(psBtn, { primary: true, onClick: () => setPatternsOpen(true) }, t('patterns.open')),
      )),
      psField({ label: t('field.other') }, h(psTextarea, { value: f.other, onChange: set('other') })),

      h('div', { className: 'ps-toolbar', style: { marginBottom: 0, marginTop: 8 } },
          h(psBtn, { primary: true, disabled: busy || !f.projectId.trim() || !f.topic.trim(), onClick: submit }, busy ? t('create.busy') : t('create.submit')),
          h('span', { className: 'ps-muted' }, t('create.output.note')),
        ),
      ),
      patternsOpen ? h(PatternsModal, { patterns, onClose: () => setPatternsOpen(false), onApply: (next) => { setPatterns(next); setPatternsOpen(false) } }) : null,
    ),
  )
}

// Two-column pattern picker in a modal: full catalog with necessity tags, must
// patterns locked on. Draft state; applying writes the selection back.
function PatternsModal(props) {
  const { patterns, onClose, onApply } = props
  const [draft, setDraft] = React.useState(patterns)
  const toggle = (id) => setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const en = langStore.val === 'en'
  const necLabel = (n) => en ? ({ must: 'Always', recommended: 'Recommended', optional: 'Optional' })[n] : ({ must: '必选', recommended: '推荐', optional: '可选' })[n]
  return h('div', { className: 'ps-modal-backdrop', onClick: onClose },
    h('div', { className: 'ps-modal ps-modal-wide', onClick: (e) => e.stopPropagation() },
      h('div', { className: 'ps-modal-head' },
        h('span', { style: { fontWeight: 600, fontSize: 15 } }, t('field.patterns')),
        h('span', { className: 'spacer', style: { flex: 1 } }),
        h(psBtn, { ghost: true, onClick: onClose }, '✕'),
      ),
      h('div', { className: 'ps-modal-body' },
        h('div', { className: 'ps-patterns-grid' },
          CATALOG_PATTERNS.map((p) => {
            const locked = p.nec === 'must'
            const on = locked || draft.includes(p.id)
            return h('label', { key: p.id, className: 'ps-pattern' + (on ? ' on' : '') + (locked ? ' must' : '') },
              h('input', { type: 'checkbox', disabled: locked, checked: on, onChange: () => toggle(p.id) }),
              h('span', { className: 'ps-pattern-body' },
                h('span', { className: 'ps-pattern-title' }, p.id + ' ' + (en ? p.en : p.zh)),
                h('span', { className: 'ps-pattern-desc' }, en ? p.enD : p.zhD),
              ),
              h('span', { className: 'ps-pattern-nec ' + p.nec }, necLabel(p.nec)),
            )
          }),
        ),
        h('div', { className: 'ps-toolbar', style: { marginTop: 16, justifyContent: 'flex-end' } },
          h(psBtn, { ghost: true, onClick: onClose }, t('create.cancel')),
          h(psBtn, { primary: true, onClick: () => onApply(draft) }, t('patterns.apply')),
        ),
      ),
    ),
  )
}

function MasDetail(props) {
  const api = props.api
  const masId = props.masId
  const [descriptor, setDescriptor] = React.useState(null)
  const [generated, setGenerated] = React.useState(null) // null = unknown
  const [units, setUnits] = React.useState([])
  const [unit, setUnit] = React.useState(null)
  const [state, setState] = React.useState(null)
  const [stageSel, setStageSel] = React.useState(0)
  const [bp, setBp] = React.useState(null) // { title, path } for the blueprint modal
  const [artifact, setArtifact] = React.useState(null)
  const [viewer, setViewer] = React.useState(null)
  const [genStatus, setGenStatus] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState(null)
  const [newUnit, setNewUnit] = React.useState('')
  const [rerun, setRerun] = React.useState(null) // { key } when the rerun modal is open
  const [unitsOpen, setUnitsOpen] = React.useState(false) // unit selector collapsed by default

  const refresh = React.useCallback(async () => {
    try {
      const g = await api.getMas(masId)
      setDescriptor(g.descriptor || null)
      setGenerated(!!g.generated)
      if (g.generated) {
        const ul = await api.unitList(masId)
        setUnits(ul.units || [])
        const defaultUnit = ul.units && ul.units[0] ? ul.units[0].key : null
        setUnit((prev) => (prev === null || prev === undefined ? defaultUnit : prev))
        const cur = unit !== null && unit !== undefined ? unit : defaultUnit
        if (cur !== undefined) {
          const st = await api.unitState(masId, cur)
          if (st.ok) setState(st)
        }
      } else {
        const gs = await api.generationStatus(masId)
        if (gs.ok) setGenStatus(gs)
      }
    } catch (e) {
      setNotice({ kind: 'err', text: String(e && e.message || e) })
    }
  }, [api, masId, unit])

  React.useEffect(() => {
    refresh()
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [refresh])

  const openArtifact = async (artifactPath, entry) => {
    setArtifact({ path: artifactPath, entry })
    setViewer(null)
    const label = str((entry && (entry.file || entry.path)) || artifactPath)
    try {
      const r = await api.artifact(masId, unit, artifactPath)
      if (r.ok) setViewer({ path: label, content: r.content, format: r.format })
      else setViewer({ path: label, content: r.error || t('artifact.read.fail'), format: 'text' })
    } catch (e) {
      setViewer({ path: label, content: String(e && e.message || e), format: 'text' })
    }
  }

  const unitHasResults = (key) => key == null
    ? !!(state && state.run)
    : !!(((units || []).find((u) => u.key === key) || {}).run)

  // A unit that has never produced outputs runs directly (after a short
  // confirm naming the topic and, for multi-unit MASes, the unit); one with
  // existing outputs opens the rerun modal (full rerun vs. continue-with-
  // instruction).
  const startRun = (key) => {
    if (unitHasResults(key)) { setRerun({ key }); return }
    const name = (descriptor && (descriptor.name || descriptor.id)) || str(masId)
    const message = key == null
      ? t('run.confirm.single', { name })
      : t('run.confirm.multi', { name, key })
    if (!window.confirm(message)) return
    requestRun(key, 'continue', '')
  }

  const requestRun = async (key, mode, instruction) => {
    setBusy(true)
    setNotice(null)
    try {
      // prepare on the host, then drive the run session through the client
      const r = await api.startRun(masId, key, { mode, instruction })
      if (!r.ok) { setNotice({ kind: 'err', text: r.error || t('run.start.fail') }); return }
      const d = props.onRun ? await props.onRun(masId, r.unitKey, r.prompt) : { ok: false, error: t('run.drive.unavailable') }
      if (d.ok) { setNotice({ kind: 'ok', text: t('run.started') }); refresh() }
      else setNotice({ kind: 'err', text: d.error || t('run.start.fail') })
    } catch (e) { setNotice({ kind: 'err', text: String(e && e.message || e) }) }
    finally { setBusy(false) }
  }

  const addUnit = async () => {
    const key = newUnit.trim()
    if (!key || busy) return
    setNotice(null)
    const r = await api.unitAdd(masId, key)
    setNewUnit('')
    if (r.ok) { refresh(); setUnit(key); setStageSel(0); setArtifact(null); setViewer(null) }
    else setNotice({ kind: 'err', text: r.error || t('unit.add.fail') })
  }

  const exportFile = async (content, format, base) => {
    const blob = await api.exportMd(content, format)
    if (!blob) { setNotice({ kind: 'err', text: t('export.fail') }); return }
    downloadBlob(blob, (base || 'pomasa') + '.' + format)
  }

  const downloadMd = () => {
    if (!viewer) return
    const blob = new Blob([String(viewer.content)], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = str(viewer.path).split('/').pop() || 'artifact.md'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
  }

  // generating state: live status from the host, not a static card
  if (generated === false) {
    const gs = (genStatus && genStatus.status) || 'idle'
    const stillWorking = gs === 'generating' || gs === 'queued'
    const failed = gs === 'failed'
    return h('div', { className: 'ps-main' },
      h('div', { className: 'ps-main-inner' },
        h(psCard, null,
          h('div', { className: 'ps-card-title' }, failed ? t('gen.card.title.failed') : stillWorking ? t('gen.card.title.working') : t('gen.card.title.idle')),
          h('div', { className: 'ps-muted', style: { marginTop: 8 } }, failed
            ? t('gen.card.failed.body')
            : stillWorking
              ? t('gen.card.working.body')
              : t('gen.card.idle.body')),
          h('div', { className: 'ps-caption', style: { marginTop: 10 } }, t('gen.status.caption') + str(gs)),
          stillWorking
            ? h('div', { className: 'ps-caption', style: { marginTop: 14 } }, t('gen.session.hint'))
            : null,
        ),
      ),
    )
  }

  const despName = str((descriptor && (descriptor.name || descriptor.id)) || '')

  if (generated === null) {
    return h('div', { className: 'ps-main' }, h('div', { className: 'ps-main-inner' }, h('div', { className: 'ps-muted' }, t('loading'))))
  }

  const stages = (state && state.stages) || []
  const stage = stages[stageSel] || stages[0] || null
  const stageIdx = stage ? stage.index : 0
  const run = (state && state.run) || null
  const runStatus = run ? str(run.status) : 'waiting'
  const ranCount = Array.isArray(units) ? units.filter((u) => u.run).length : 0
  const unitTotal = Array.isArray(units) ? units.length : 0

  return h('div', { className: 'ps-main' },
    h('div', { className: 'ps-main-inner' },
      h('div', { className: 'ps-info-bar' },
        h('div', null,
          h('h2', null, despName),
          h('div', { className: 'ps-info-caption' },
            'ID ' + str(masId) + (descriptor && descriptor.schemaVersion ? ' · schema ' + str(descriptor.schemaVersion) : '')),
        ),
        h('div', { className: 'spacer' }),
        runStatus === 'running' || runStatus === 'queued'
          ? h(psBtn, {
              className: 'ps-btn-danger',
              style: { borderColor: 'var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)' },
              onClick: () => {
                if (window.confirm(t('confirm.cancel.run'))) {
                  if (props.onCancelRun) props.onCancelRun(masId, unit).then(() => refresh())
                  else refresh()
                }
              },
            }, t('cancel.run'))
          : null,
        runStatus === 'running' || runStatus === 'queued'
          ? h(psBtn, { disabled: true }, t('running'))
          : h(psBtn, {
              primary: true,
              disabled: busy,
              onClick: () => {
                // one run = one unit, human-initiated: multi mode runs the
                // currently selected unit (never a batch); single runs the MAS
                if (descriptor && descriptor.work && descriptor.work.mode === 'multi') {
                  const key = unit || ((units.find((u) => !u.run) || {}).key)
                  if (key) startRun(key)
                } else {
                  startRun(null)
                }
              },
            }, t('run')),
      ),

    notice ? h('div', { className: 'ps-notice ' + notice.kind }, str(notice.text)) : null,

    Array.isArray(units) && units.length > 1 ? h(psCard, null,
      h('div', { className: 'ps-units-head', style: { marginBottom: unitsOpen ? 10 : 0 }, role: 'button', 'aria-expanded': unitsOpen ? 'true' : 'false', onClick: () => setUnitsOpen((v) => !v), title: unitsOpen ? t('units.collapse') : t('units.expand') },
        h('div', { className: 'ps-units-title' }, t('unit.label')),
        h('div', { className: 'ps-units-summary' }, t('units.summary', { sel: str(unit || t('unit.none')), n: ranCount, total: unitTotal, left: unitTotal - ranCount })),
        h('span', { className: 'ps-units-caret' + (unitsOpen ? ' open' : '') }, '▾'),
      ),
      unitsOpen ? h('div', { className: 'ps-unit-add' },
        h(psInput, { value: newUnit, placeholder: t('unit.add.ph'), onChange: (e) => setNewUnit(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') addUnit() }, style: { flex: 1, minWidth: 0 } }),
        h(psBtn, { primary: true, onClick: addUnit, disabled: !newUnit.trim() }, t('unit.add')),
      ) : null,
      unitsOpen ? h('div', null, units.map((u) =>
        h('div', { key: str(u.key), className: 'ps-unit-row' + (u.key === unit ? ' on' : ''), onClick: () => { setUnit(u.key); setStageSel(0); setArtifact(null); setViewer(null) } },
          h('span', null, str(u.key)),
          h('span', { className: 'spacer', style: { flex: 1 } }),
          u.run ? psBadge('completed', t('unit.ran')) : u.planned ? psBadge('generating', t('unit.planned')) : psBadge('idle', t('not.run')),
          h(psBtn, { ghost: true, style: { padding: '3px 10px' }, onClick: (e) => { e.stopPropagation(); startRun(u.key) } }, t('run')),
        ),
      )) : null,
    ) : null,

    h('div', { className: 'ps-stages', style: { marginTop: 20 } },
      stages.map((s) => {
        const agentFile = descriptor ? ((descriptor.stages || []).find((x) => x.index === s.index) || {}).agent : null
        return h('div', { key: s.index, className: 'ps-stage' + (s.index === stageIdx ? ' on' : ''), onClick: () => { setStageSel(stages.indexOf(s)); setArtifact(null); setViewer(null) } },
          h('div', { className: 'ps-stage-on', style: { background: stageColor(s.status) } }),
          h('div', {
            className: 'ps-stage-name',
            title: agentFile ? t('view.blueprint') + ' ' + str(agentFile) : undefined,
            onClick: (e) => {
              e.stopPropagation()
              // a stage may carry no blueprint file (prose agent, e.g. a shared
              // orchestrator) — only offer the modal when there is one
              if (agentFile) setBp({ title: str(s.title), path: String(agentFile), index: s.index })
            },
          }, str(s.title)),
          h('div', { className: 'ps-stage-count' }, stageCountText(s)),
        )
      }),
    ),

    stage ? h('div', { key: 'stage-' + str(stageIdx), style: { marginTop: 20 } },
      stageContractCards(stage, unit, api, openArtifact, artifact, (p) => api.artifactHead(masId, unit, p)),
    ) : h(psEmpty, { title: t('choose.stage') }),

    viewer ? h(ArtifactModal, { viewer, onClose: () => { setArtifact(null); setViewer(null) }, onDownload: downloadMd, onExport: exportFile }) : null,
    bp ? h(BlueprintModal, { api, masId, path: bp.path, title: bp.title, stage: bp.index, onClose: () => setBp(null), onExport: exportFile }) : null,
    rerun ? h(RerunModal, { unitKey: rerun.key, onClose: () => setRerun(null), onRun: (mode, instruction) => { setRerun(null); requestRun(rerun.key, mode, instruction) } }) : null,
    ),
  )
}

function BlueprintModal(props) {
  const { onExport } = props
  const [data, setData] = React.useState(null)
  const [err, setErr] = React.useState(null)
  React.useEffect(() => {
    let stop = false
    props.api.blueprintRead(props.masId, props.path, props.stage)
      .then((r) => { if (!stop) { if (r.ok) setData(r); else setErr(r.error || t('artifact.read.fail')) } })
      .catch((e) => { if (!stop) setErr(String(e && e.message || e)) })
    return () => { stop = true }
  }, [props.masId, props.path, props.api])
  return h('div', { className: 'ps-modal-backdrop', onClick: props.onClose },
    h('div', { className: 'ps-modal', onClick: (e) => e.stopPropagation() },
      h('div', { className: 'ps-modal-head' },
        h('span', { style: { fontWeight: 600, fontSize: 15 } }, str(props.title) + ' · ' + t('modal.blueprint')),
        h('span', { className: 'spacer', style: { flex: 1 } }),
        onExport && data && data.format === 'markdown' ? h(psBtn, { ghost: true, onClick: () => onExport(str(data.content), 'pdf', str(props.title) || 'blueprint') }, t('export.pdf')) : null,
        onExport && data && data.format === 'markdown' ? h(psBtn, { ghost: true, onClick: () => onExport(str(data.content), 'docx', str(props.title) || 'blueprint') }, t('export.docx')) : null,
        h(psBtn, { ghost: true, onClick: props.onClose }, '✕'),
      ),
      h('div', { className: 'ps-modal-body' },
        err ? h('div', { className: 'ps-muted' }, err)
          : data === null ? h('div', { className: 'ps-muted' }, t('loading'))
          : data.format === 'markdown' ? renderMarkdown(String(data.content || ''))
          : data.format === 'json' ? h('pre', { className: 'ps-pre' }, prettyJson(String(data.content || '')))
          : h('pre', { className: 'ps-pre' }, String(data.content || '')),
      ),
    ),
  )
}

// Artifact viewer as a modal — the artifacts list stays full-width; clicking an
// artifact opens its content in a wide dialog (same form as the blueprint modal).
function ArtifactModal(props) {
  const { viewer, onClose, onDownload, onExport } = props
  const exportBase = (str(viewer.path).split('/').pop() || 'artifact').replace(/\.md$/i, '')
  return h('div', { className: 'ps-modal-backdrop', onClick: onClose },
    h('div', { className: 'ps-modal ps-modal-wide', onClick: (e) => e.stopPropagation() },
      h('div', { className: 'ps-modal-head' },
        h('span', { style: { flex: 1, fontWeight: 600, fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, str(viewer.path)),
        h('span', { className: 'ps-muted' }, str(viewer.format)),
        h(psBtn, { ghost: true, onClick: onDownload }, t('artifact.download')),
        onExport ? h(psBtn, { ghost: true, onClick: () => onExport(str(viewer.content), 'pdf', exportBase) }, t('export.pdf')) : null,
        onExport ? h(psBtn, { ghost: true, onClick: () => onExport(str(viewer.content), 'docx', exportBase) }, t('export.docx')) : null,
        h(psBtn, { ghost: true, onClick: onClose }, '✕'),
      ),
      h('div', { className: 'ps-modal-body ps-artifact-body' },
        viewer.format === 'json'
          ? h('pre', { className: 'ps-pre' }, prettyJson(String(viewer.content || '')))
          : viewer.format === 'markdown'
            ? renderMarkdown(String(viewer.content || ''))
            : h('pre', { className: 'ps-pre' }, String(viewer.content || '')),
      ),
    ),
  )
}

// Rerun chooser: a unit with existing outputs may be rerun from scratch
// (destructive, prominent) or continued on top of its outputs following a
// free-text instruction. Either path gets a second confirmation.
function RerunModal(props) {
  const { unitKey, onClose, onRun } = props
  const [step, setStep] = React.useState('choose') // 'choose' | 'confirm'
  const [mode, setMode] = React.useState('fresh')
  const [text, setText] = React.useState('')
  const choose = (m) => { setMode(m); setStep('confirm') }
  const confirmRun = () => onRun(mode, text)
  return h('div', { className: 'ps-modal-backdrop', onClick: onClose },
    h('div', { className: 'ps-modal', onClick: (e) => e.stopPropagation() },
      h('div', { className: 'ps-modal-head' },
        h('span', { style: { fontWeight: 600, fontSize: 15 } }, t('rerun.title')),
        h('span', { className: 'spacer', style: { flex: 1 } }),
        h(psBtn, { ghost: true, onClick: onClose }, '✕'),
      ),
      h('div', { className: 'ps-modal-body' },
        step === 'choose' ? h('div', { className: 'ps-rerun' },
          h('div', { className: 'ps-rerun-opt' },
            h('div', { className: 'ps-rerun-opt-title' }, t('rerun.fresh')),
            h('div', { className: 'ps-rerun-opt-body' }, t('rerun.fresh.body')),
            h(psBtn, { className: 'ps-rerun-fresh', onClick: () => choose('fresh') }, t('rerun.fresh.go')),
          ),
          h('div', { className: 'ps-rerun-opt' },
            h('div', { className: 'ps-rerun-opt-title' }, t('rerun.continue')),
            h('div', { className: 'ps-rerun-opt-body' }, t('rerun.continue.body')),
            h(psTextarea, { className: 'ps-rerun-input', value: text, placeholder: t('rerun.ph'), onChange: (e) => setText(e.target.value) }),
            h(psBtn, { primary: true, disabled: !text.trim(), onClick: () => choose('continue') }, t('rerun.continue.go')),
          ),
        ) : h('div', { className: 'ps-rerun' },
          h('div', { className: 'ps-rerun-confirm' + (mode === 'fresh' ? ' danger' : '') },
            mode === 'fresh' ? t('rerun.confirm.fresh') : t('rerun.confirm.continue')),
          mode === 'continue' && text.trim() ? h('div', { className: 'ps-rerun-instruction' },
            h('div', { className: 'ps-rerun-instruction-label' }, t('rerun.instruction.label')),
            str(text)) : null,
          h('div', { className: 'ps-toolbar', style: { marginTop: 18, justifyContent: 'flex-end' } },
            h(psBtn, { ghost: true, onClick: () => setStep('choose') }, t('rerun.back')),
            h(psBtn, { ghost: true, onClick: onClose }, t('rerun.cancel')),
            h(psBtn, { primary: true, className: mode === 'fresh' ? 'ps-rerun-confirm-btn' : '', onClick: confirmRun }, t('rerun.go')),
          ),
        ),
      ),
    ),
  )
}

function stageColor(status) {
  return {
    waiting: 'transparent',
    active: 'var(--dsw-alias-brand-primary)',
    completed: 'var(--dsw-alias-state-success-primary)',
    failed: 'var(--dsw-alias-state-error-primary)',
    skipped: 'transparent',
    aborted: 'var(--dsw-alias-state-warn-primary)',
  }[stateColorSafe(status)] || 'transparent'
}

function stateColorSafe(status) {
  return typeof status === 'string' ? status : 'waiting'
}

function stageCountText(s) {
  const st = s && STAGE_STATUS_TEXT[s.status] ? STAGE_STATUS_TEXT[s.status]() : null
  return st ? t('stage.count.text', { n: str(s.artifactCount), st }) : t('stage.count.plain', { n: str(s.artifactCount) })
}

function stageContractCards(stage, unit, api, openArtifact, artifact, onHead) {
  if (!stage) return null
  if (!stage.contracts || !stage.contracts.length) {
    return h(psEmpty, { title: t('stage.no.contract'), hint: t('stage.no.contract.hint', { t: str(stage.title) }) })
  }
  const all = []
  const seen = new Set()
  const multi = new Set() // paths referenced by more than one index row -> batch files
  for (const c of stage.contracts) {
    const entries = Array.isArray(c.index) ? c.index : []
    for (const e of entries || []) {
      if (!e || typeof e !== 'object') continue
      // Attribute an entry to the contract whose artifact id matches its id
      // when one exists; otherwise to the contract that listed it first.
      const matched = e.id != null
        ? stage.contracts.find((x) => x.id != null && String(x.id) === String(e.id))
        : undefined
      const owner = matched || c
      const path = resolveArtifactPath(owner, e)
      if (!path) continue
      // The physical file is the artifact. Several index rows may all name the
      // same file (the generator batches many sources into one .md); render it
      // once, and mark it as a batch so its card uses the file's own H1 title.
      if (seen.has(path)) { multi.add(path); continue }
      seen.add(path)
      all.push({ contract: owner.id, contractTitle: owner.title, entry: e, path })
    }
  }
  if (stage.status !== 'completed' && !all.length) {
    return h(psEmpty, { title: t('stage.no.artifacts'), hint: t('stage.no.artifacts.hint', { st: STAGE_STATUS_TEXT[stage.status] ? STAGE_STATUS_TEXT[stage.status]() : str(stage.status) }) })
  }
  if (!all.length) {
    return h(psEmpty, { title: t('stage.no.artifact'), hint: t('stage.empty.hint', { t: str(stage.title) }) })
  }
  return h('div', { className: 'ps-artlist' },
    all.map((a, idx) => {
      const e = a.entry
      const active = artifact && artifact.path === a.path
      return h(ArtifactCard, {
        key: idx,
        entry: e,
        presetTitle: str(e.title || e.id || e.path || e.file) || t('artifact.unnamed'),
        path: a.path,
        forceTitle: multi.has(a.path),
        onHead,
        active,
        onClick: () => openArtifact(a.path, a.entry),
        contract: a.contractTitle ? str(a.contractTitle) : (a.contract ? str(a.contract) : null),
      })
    }),
  )
}

// Artifact card. For BATCH files (several index rows in one .md) the card
// represents the FILE and lazily loads its own first heading as the title;
// plain artifacts keep their entry title.
function ArtifactCard(props) {
  const { entry, presetTitle, path, forceTitle, active, onClick, contract, onHead } = props
  const [h1, setH1] = React.useState(null)
  React.useEffect(() => {
    if (!forceTitle || !path || typeof onHead !== 'function') return
    let stop = false
    onHead(path)
      .then((r) => { if (!stop && r && r.ok && r.title) setH1(r.title) })
      .catch(() => {})
    return () => { stop = true }
  }, [path, forceTitle, onHead])
  const title = str(forceTitle && h1 ? h1 : presetTitle)
  const file = str((entry && (entry.file || entry.path)) || path)
  return h('div', { className: 'ps-card ps-art' + (active ? ' on' : ''), onClick },
    h('div', { className: 'ps-art-title' }, title),
    entry.subtitle ? h('div', { className: 'ps-art-sub' }, str(entry.subtitle)) : null,
    entry.summary ? h('div', { className: 'ps-art-sum' }, str(entry.summary)) : null,
    h('div', { className: 'ps-art-meta' },
      h('span', null, file.split('/').pop()),
      entry.size ? h('span', null, fmtSize(entry.size)) : null,
      contract ? h('span', null, contract) : null,
    ),
  )
}

// OBV-01: an index entry's `file` resolves relative to the index.json's own
// directory. Some agents write workspace-relative paths instead (already
// prefixed with the stage dir). Compose the unit-root-relative path, keeping
// an already-prefixed path as-is.
function resolveArtifactPath(contract, entry) {
  const seg = str((entry && (entry.file || entry.path)) || '')
  if (!contract || !contract.indexPath || !seg) return seg
  const dir = String(contract.indexPath).split('/').slice(0, -1).join('/')
  if (!dir) return seg
  return seg.startsWith(dir + '/') ? seg : dir + '/' + seg
}

function fmtSize(n) {
  if (!n) return ''
  if (n > 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB'
  if (n > 1024) return Math.round(n / 1024) + ' KB'
  return n + ' B'
}

function prettyJson(content) {
  try { return JSON.stringify(JSON.parse(content), null, 2) } catch (e) { return content }
}
