// Three pages: MAS list, create form, MAS detail. Data flows through the host API only.
// str() guards every dynamic text node so a non-string value from index.json or
// run.json degrades to text instead of crashing the render tree.

function str(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  try { return JSON.stringify(v) } catch { return String(v) }
}

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
    patterns: '', qaLevel: 'Standard', other: '',
  }))
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
        psField({ label: t('field.projectId') }, h(psInput, { value: f.projectId, onChange: set('projectId'), placeholder: t('ph.projectId') })),
        psField({ label: t('field.name') }, h(psInput, { value: f.name, onChange: set('name'), placeholder: t('ph.name') })),
      ),
      h('div', { className: 'ps-form-row' },
        psField({ label: t('field.language') }, h(psInput, { value: f.language, onChange: set('language') })),
        psField({ label: t('field.reportLanguage') }, h(psInput, { value: f.reportLanguage, onChange: set('reportLanguage') })),
      ),
      psField({ label: t('field.topic'), hint: t('field.topic.hint') },
        h(psTextarea, { value: f.topic, onChange: set('topic'), placeholder: t('ph.topic') })),
      psField({ label: t('field.ideas') }, h(psTextarea, { value: f.ideas, onChange: set('ideas') })),
      psField({ label: t('field.dataSources') }, h(psInput, { value: f.dataSources, onChange: set('dataSources') })),
      psField({ label: t('field.refs') }, h(psTextarea, { value: f.refs, onChange: set('refs') })),
      psField({ label: t('field.analysis') }, h(psTextarea, { value: f.analysis, onChange: set('analysis') })),
      h('div', { className: 'ps-form-row' },
        psField({ label: t('field.reportFormat') }, h(psInput, { value: f.reportFormat, onChange: set('reportFormat') })),
        psField({ label: t('field.reportStructure') }, h(psInput, { value: f.reportStructure, onChange: set('reportStructure') })),
      ),

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

      h('div', { className: 'ps-form-row' },
        psField({ label: t('field.qaLevel') },
          h('select', { className: 'ps-select', value: f.qaLevel, onChange: set('qaLevel') },
            h('option', { value: 'Simple' }, 'Simple'),
            h('option', { value: 'Standard' }, t('qa.standard')),
            h('option', { value: 'Strict' }, 'Strict'),
          )),
        psField({ label: t('field.patterns') }, h(psInput, { value: f.patterns, onChange: set('patterns'), placeholder: t('ph.patterns') })),
      ),
      psField({ label: t('field.other') }, h(psTextarea, { value: f.other, onChange: set('other') })),

      h('div', { className: 'ps-toolbar', style: { marginBottom: 0, marginTop: 8 } },
          h(psBtn, { primary: true, disabled: busy || !f.projectId.trim() || !f.topic.trim(), onClick: submit }, busy ? t('create.busy') : t('create.submit')),
          h('span', { className: 'ps-muted' }, t('create.output.note')),
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

  const startRun = async (key) => {
    // Re-running overwrites whatever the unit already produced — confirm when a
    // previous run record exists (single: unit root run.json; multi: that unit's).
    const hasResults = key == null
      ? !!(state && state.run)
      : !!(((units || []).find((u) => u.key === key) || {}).run)
    if (hasResults && !window.confirm(t('confirm.rerun'))) return
    setBusy(true)
    setNotice(null)
    try {
      // prepare on the host, then drive the run session through the client
      const r = await api.startRun(masId, key)
      if (!r.ok) { setNotice({ kind: 'err', text: r.error || t('run.start.fail') }); return }
      const d = props.onRun ? await props.onRun(masId, r.unitKey, r.prompt) : { ok: false, error: t('run.drive.unavailable') }
      if (d.ok) { setNotice({ kind: 'ok', text: t('run.started') }); refresh() }
      else setNotice({ kind: 'err', text: d.error || t('run.start.fail') })
    } catch (e) { setNotice({ kind: 'err', text: String(e && e.message || e) }) }
    finally { setBusy(false) }
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
      h('div', { className: 'ps-card-title', style: { marginBottom: 10 } }, t('unit.label')),
      h('div', null, units.map((u) =>
        h('div', { key: str(u.key), className: 'ps-unit-row' + (u.key === unit ? ' on' : ''), onClick: () => { setUnit(u.key); setStageSel(0); setArtifact(null); setViewer(null) } },
          h('span', null, str(u.key)),
          h('span', { className: 'spacer', style: { flex: 1 } }),
          u.run ? psBadge('completed', t('unit.ran')) : u.planned ? psBadge('generating', t('unit.planned')) : psBadge('idle', t('not.run')),
          h(psBtn, { ghost: true, style: { padding: '3px 10px' }, onClick: (e) => { e.stopPropagation(); startRun(u.key) } }, t('run')),
        ),
      )),
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

    viewer ? h(ArtifactModal, { viewer, onClose: () => { setArtifact(null); setViewer(null) }, onDownload: downloadMd }) : null,
    bp ? h(BlueprintModal, { api, masId, path: bp.path, title: bp.title, stage: bp.index, onClose: () => setBp(null) }) : null,
    ),
  )
}

function BlueprintModal(props) {
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
  const { viewer, onClose, onDownload } = props
  return h('div', { className: 'ps-modal-backdrop', onClick: onClose },
    h('div', { className: 'ps-modal ps-modal-wide', onClick: (e) => e.stopPropagation() },
      h('div', { className: 'ps-modal-head' },
        h('span', { style: { flex: 1, fontWeight: 600, fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, str(viewer.path)),
        h('span', { className: 'ps-muted' }, str(viewer.format)),
        h(psBtn, { ghost: true, onClick: onDownload }, t('artifact.download')),
        h(psBtn, { ghost: true, disabled: true, title: t('artifact.export.tip') }, t('artifact.export')),
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
