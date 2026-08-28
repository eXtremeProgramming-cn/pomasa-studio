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
      .then((r) => { if (r.ok) { setMas(r.mas); setError(null) } else setError(r.error) })
      .catch((e) => setError(String(e && e.message || e)))
  }, [api])

  React.useEffect(() => {
    refresh()
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [refresh])

  return h('div', { className: 'ps-page' },
    h('div', { className: 'ps-toolbar' },
      h('div', null,
        h('h1', { className: 'ps-h1' }, 'POMASA Studio'),
        h('div', { className: 'ps-sub' }, '全部研究 MAS 的全局工作台'),
      ),
      h('div', { className: 'spacer' }),
      h(psBtn, { primary: true, onClick: props.onCreate }, '新建 MAS'),
    ),
    error ? h('div', { className: 'ps-notice err' }, error) : null,
    mas === null ? h('div', { className: 'ps-muted', style: { padding: '40px 0' } }, '加载中…') :
    mas.length === 0 ?
      h(psEmpty, { title: '还没有 MAS', hint: '新建一个研究多代理系统，从填写需求开始。' }) :
      h('div', { className: 'ps-grid' },
        mas.map((m) =>
          h(psCard, { key: m.id, className: 'clickable', onClick: () => props.onOpen(m.id) },
            h('div', { className: 'ps-card-title' }, str(m.name || m.id)),
            h('div', { className: 'ps-card-desc' }, str(m.description || '')),
            h('div', { className: 'ps-card-footer' },
              h(psBadge, { status: MAS_STATUS_BADGE[m.status] || 'idle' }, MAS_STATUS_TEXT[m.status] || m.status),
              h('span', { className: 'ps-muted' }, 'ID: ' + str(m.id)),
              h('span', { className: 'spacer', style: { flex: 1 } }),
              h('span', { className: 'ps-caption' }, m.lastRunAt ? '上次运行 ' + fmtTime(m.lastRunAt) : '未运行'),
            ),
          ),
        ),
      ),
  )
}

function CreateMas(props) {
  const api = props.api
  const [f, setF] = React.useState({
    name: '', projectId: '', language: 'Chinese', reportLanguage: 'Chinese',
    topic: '', ideas: '', dataSources: '公开网络信息', refs: '',
    analysis: '', reportFormat: '研究报告', reportStructure: '',
    runMode: 'single', runDimensions: '', runUnits: '',
    patterns: '', qaLevel: 'Standard', other: '',
  })
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
      if (!r.ok) { setError(r.error || '创建失败'); return }
      if (r.generation === 'external') {
        setError('未找到生成会话服务（agentLoop）。系统已创建，请回列表后台手动生成。')
        return
      }
      props.onDone(r.masId)
    } catch (e) {
      setError(String(e && e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return h('div', { className: 'ps-page' },
    h('div', { className: 'ps-toolbar' },
      h(psBtn, { ghost: true, onClick: () => props.onCancel() }, '← 返回'),
      h('h1', { className: 'ps-h1', style: { margin: 0 } }, '新建 MAS'),
    ),
    h('div', { className: 'ps-sub' }, '填写需求，生成器将按 POMASA 模式生成整个研究多代理系统。留空项由 AI 建议。'),
    error ? h('div', { className: 'ps-notice err' }, error) : null,

    h(psCard, null,
      h('div', { className: 'ps-form-row' },
        psField({ label: '项目标识（英文短标识）' }, h(psInput, { value: f.projectId, onChange: set('projectId'), placeholder: 'e.g. llm_south' })),
        psField({ label: '系统名称' }, h(psInput, { value: f.name, onChange: set('name'), placeholder: '可留空' })),
      ),
      h('div', { className: 'ps-form-row' },
        psField({ label: '蓝图语言' }, h(psInput, { value: f.language, onChange: set('language') })),
        psField({ label: '报告语言' }, h(psInput, { value: f.reportLanguage, onChange: set('reportLanguage') })),
      ),
      psField({ label: '研究主题与核心问题', hint: '这个系统要研究什么，要回答哪些核心问题。' },
        h(psTextarea, { value: f.topic, onChange: set('topic'), placeholder: '必填' })),
      psField({ label: '初始想法与见解' }, h(psTextarea, { value: f.ideas, onChange: set('ideas') })),
      psField({ label: '数据来源' }, h(psInput, { value: f.dataSources, onChange: set('dataSources') })),
      psField({ label: '参考资料（每行一条，路径或 URL）' }, h(psTextarea, { value: f.refs, onChange: set('refs') })),
      psField({ label: '分析方法' }, h(psTextarea, { value: f.analysis, onChange: set('analysis') })),
      h('div', { className: 'ps-form-row' },
        psField({ label: '报告形式' }, h(psInput, { value: f.reportFormat, onChange: set('reportFormat') })),
        psField({ label: '报告结构' }, h(psInput, { value: f.reportStructure, onChange: set('reportStructure') })),
      ),

      h('div', { className: 'ps-form-row' },
        psField({ label: '运行方式', hint: '整体跑一次，还是按实体/日期拆成多个单元分别跑。' },
          h('select', { className: 'ps-select', value: f.runMode, onChange: set('runMode') },
            h('option', { value: 'single' }, '整体跑一次'),
            h('option', { value: 'multi' }, '拆成多个单元'),
          )),
        h('div', { className: 'ps-field h-nowrap' },
          h('label', null, '单元维度（multi 时）'),
          h(psInput, { value: f.runDimensions, onChange: set('runDimensions'), disabled: f.runMode !== 'multi' }),
        ),
      ),
      f.runMode === 'multi' ?
        psField({ label: '初始单元列表（每行一个，可留空由系统枚举）' }, h(psTextarea, { value: f.runUnits, onChange: set('runUnits') })) : null,

      h('div', { className: 'ps-form-row' },
        psField({ label: '质量等级' },
          h('select', { className: 'ps-select', value: f.qaLevel, onChange: set('qaLevel') },
            h('option', { value: 'Simple' }, 'Simple'),
            h('option', { value: 'Standard' }, 'Standard（默认）'),
            h('option', { value: 'Strict' }, 'Strict'),
          )),
        psField({ label: '其它模式开关' }, h(psInput, { value: f.patterns, onChange: set('patterns'), placeholder: '无' })),
      ),
      psField({ label: '其它要求' }, h(psTextarea, { value: f.other, onChange: set('other') })),

      h('div', { className: 'ps-toolbar', style: { marginBottom: 0, marginTop: 8 } },
        h(psBtn, { primary: true, disabled: busy || !f.projectId.trim() || !f.topic.trim(), onClick: submit }, busy ? '生成中…' : '生成 MAS'),
        h('span', { className: 'ps-muted' }, '输出统一为 Markdown，导出由查看器按需提供。'),
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
  const [artifact, setArtifact] = React.useState(null)
  const [viewer, setViewer] = React.useState(null)
  const [genStatus, setGenStatus] = React.useState(null)
  const [logOpen, setLogOpen] = React.useState(false)
  const [log, setLog] = React.useState([])
  const [intervene, setIntervene] = React.useState('')
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
      else setViewer({ path: label, content: r.error || '读取失败', format: 'text' })
    } catch (e) {
      setViewer({ path: label, content: String(e && e.message || e), format: 'text' })
    }
  }

  const startRun = async (targets) => {
    setBusy(true)
    setNotice(null)
    try {
      const r = await api.startRun(masId, targets)
      if (!r.ok) setNotice({ kind: 'err', text: r.error || '启动失败' })
      else {
        setNotice({ kind: 'ok', text: '运行已启动' + (targets && targets.length ? '（' + targets.length + ' 个单元）' : '') })
        refresh()
      }
    } catch (e) { setNotice({ kind: 'err', text: String(e && e.message || e) }) }
    finally { setBusy(false) }
  }

  const sendIntervene = async () => {
    const msg = intervene.trim()
    if (!msg) return
    setIntervene('')
    try { await api.intervene(masId, unit, msg); setNotice({ kind: 'ok', text: '已注入运行会话' }) }
    catch (e) { setNotice({ kind: 'err', text: String(e && e.message || e) }) }
  }

  const toggleLog = async () => {
    const open = !logOpen
    setLogOpen(open)
    if (open) {
      try { const r = await api.runLog(masId, unit); if (r.ok) setLog(r.events || []) } catch (e) { /* ignore */ }
    }
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
    return h('div', { className: 'ps-page' },
      h('div', { className: 'ps-toolbar' }, h(psBtn, { ghost: true, onClick: props.onBack }, '← 返回')),
      h(psCard, null,
        h('div', { className: 'ps-card-title' }, failed ? '生成失败' : stillWorking ? '生成中' : '生成未启动'),
        h('div', { className: 'ps-muted', style: { marginTop: 8 } }, failed
          ? '生成会话已结束但未产出 pomasa.json。可能模型不可用或生成中断，请检查会话日志后重试。'
          : stillWorking
            ? '生成器会话正在按 POMASA 模式构造系统。完成后自动进入详情；可在桌面会话区看到生成进度。'
            : '未检测到生成会话，生成服务可能不可用或会话已失败。'),
        h('div', { className: 'ps-caption', style: { marginTop: 10 } }, 'generation.status = ' + str(gs)),
      ),
    )
  }

  const despName = str((descriptor && (descriptor.name || descriptor.id)) || '')

  if (generated === null) {
    return h('div', { className: 'ps-page' }, h('div', { className: 'ps-muted' }, '加载中…'))
  }

  const stages = (state && state.stages) || []
  const stage = stages[stageSel] || stages[0] || null
  const stageIdx = stage ? stage.index : 0
  const run = (state && state.run) || null
  const runStatus = run ? str(run.status) : 'waiting'

  return h('div', { className: 'ps-page' },
    h('div', { className: 'ps-toolbar' },
      h(psBtn, { ghost: true, onClick: props.onBack }, '← 列表'),
      h('div', null,
        h('h1', { className: 'ps-h1', style: { margin: 0 } }, despName),
        h('div', { className: 'ps-sub', style: { marginBottom: 0 } },
          'ID ' + str(masId) + (descriptor && descriptor.schemaVersion ? ' · schema ' + str(descriptor.schemaVersion) : ''),
        ),
      ),
      h('div', { className: 'spacer' }),
      runStatus === 'running' || runStatus === 'queued' ?
        h(psBtn, { ghost: true, onClick: () => api.cancelRun(masId, unit).then(() => refresh()) }, '取消运行') : null,
      h(psBtn, { primary: true, disabled: busy, onClick: () => startRun(Array.isArray(units) ? units.filter((u) => !u.run).map((u) => u.key) : []) }, '运行'),
    ),

    notice ? h('div', { className: 'ps-notice ' + notice.kind }, str(notice.text)) : null,

    Array.isArray(units) && units.length > 1 ? h(psCard, null,
      h('div', { className: 'ps-card-title', style: { marginBottom: 10 } }, '单元'),
      h('div', null, units.map((u) =>
        h('div', { key: str(u.key), className: 'ps-unit-row' + (u.key === unit ? ' on' : ''), onClick: () => { setUnit(u.key); setStageSel(0); setArtifact(null); setViewer(null) } },
          h('span', null, str(u.key)),
          h('span', { className: 'spacer', style: { flex: 1 } }),
          u.run ? psBadge('completed', '已运行') : u.planned ? psBadge('generating', '已规划未运行') : psBadge('idle', '未运行'),
          h(psBtn, { ghost: true, style: { padding: '3px 10px' }, onClick: (e) => { e.stopPropagation(); startRun([u.key]) } }, '运行'),
        ),
      )),
    ) : null,

    h('div', { className: 'ps-stages', style: { marginTop: 20 } },
      stages.map((s) =>
        h('div', { key: s.index, className: 'ps-stage' + (s.index === stageIdx ? ' on' : ''), onClick: () => { setStageSel(stages.indexOf(s)); setArtifact(null); setViewer(null) } },
          h('div', { className: 'ps-stage-on', style: { background: stageColor(s.status) } }),
          h('div', { className: 'ps-stage-name' }, str(s.title)),
          h('div', { className: 'ps-stage-count' }, stageCountText(s)),
        ),
      ),
    ),

    h('div', { className: 'ps-panel' },
      h('div', null,
        stage ? h('div', { key: 'stage-' + str(stageIdx) },
          stageContractCards(stage, unit, api, openArtifact, artifact),
        ) : h(psEmpty, { title: '选择阶段' }),
      ),
      h('div', null,
        viewer ? h('div', { className: 'ps-viewer' },
          h('div', { className: 'ps-viewer-head' },
            h(psBtn, { ghost: true, onClick: () => { setArtifact(null); setViewer(null) } }, '✕'),
            h('span', { style: { flex: 1, fontWeight: 600, fontSize: 15 } }, str(viewer.path)),
            h('span', { className: 'ps-muted' }, str(viewer.format)),
            h(psBtn, { ghost: true, onClick: downloadMd }, '下载 Markdown'),
            h(psBtn, { ghost: true, disabled: true, title: 'docx / pdf 导出即将支持' }, '导出 docx/pdf'),
          ),
          h('div', { className: 'ps-viewer-body' },
            viewer.format === 'json'
              ? h('pre', { className: 'ps-pre' }, prettyJson(String(viewer.content || '')))
              : viewer.format === 'markdown'
                ? renderMarkdown(String(viewer.content || ''))
                : h('pre', { className: 'ps-pre' }, String(viewer.content || '')),
          ),
        ) :
          h('div', { className: 'ps-run-info' },
            run ? h(psCard, null,
              h('div', { className: 'ps-card-title', style: { marginBottom: 8 } }, '运行信息'),
              h('div', { className: 'ps-muted', style: { display: 'grid', gap: 4 } },
                h('span', null, '单元：' + str(run.unit || 'single')),
                h('span', null, '状态：' + str(runStatus)),
                h('span', null, '启动：' + fmtTime(run.created_at || run.started_at)),
                h('span', null, '结束：' + fmtTime(run.finished_at)),
                h('span', null, '触发：' + str(run.trigger || '—') + (run.runtime ? ' · 运行时 ' + str(run.runtime) : '')),
              ),
            ) : null,
            h(psLogPanel, { logOpen, log, toggleLog, onIntervene: sendIntervene, intervene, setIntervene, runStatus }),
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
  const status = (s && STAGE_STATUS_TEXT[s.status] ? str(s.artifactCount) + ' 产物 · ' + STAGE_STATUS_TEXT[s.status] : str(s.artifactCount) + ' 产物')
  return status
}

function stageContractCards(stage, unit, api, openArtifact, artifact) {
  if (!stage) return null
  if (!stage.contracts || !stage.contracts.length) {
    return h(psEmpty, { title: '该阶段无产物契约', hint: str(stage.title) + ' 不产出可见产物（如枚举或编排阶段）。' })
  }
  const all = []
  for (const c of stage.contracts) {
    const entries = Array.isArray(c.index) ? c.index : []
    for (const e of entries || []) {
      if (e && typeof e === 'object') {
        all.push({ contract: c.id, contractTitle: c.title, entry: e, path: resolveArtifactPath(c, e) })
      }
    }
  }
  if (stage.status !== 'completed' && !all.length) {
    return h(psEmpty, { title: '该阶段尚未产出', hint: '状态：' + str(STAGE_STATUS_TEXT[stage.status] || stage.status) + '。等待运行推到这一阶段。' })
  }
  if (!all.length) {
    return h(psEmpty, { title: '该阶段暂无产物', hint: '阶段 ' + str(stage.title) + ' 的 index 为空。' })
  }
  return h('div', { className: 'ps-artlist' },
    all.map((a, idx) => {
      const e = a.entry
      const title = str(e.title || e.id || e.path || e.file) || '(未命名)'
      const file = str(e.file || e.path)
      const active = artifact && artifact.path === a.path
      return h('div', { key: idx, className: 'ps-card ps-art' + (active ? ' on' : ''), onClick: () => openArtifact(a.path, a.entry) },
        h('div', { className: 'ps-art-title' }, title),
        e.subtitle ? h('div', { className: 'ps-art-sub' }, str(e.subtitle)) : null,
        e.summary ? h('div', { className: 'ps-art-sum' }, str(e.summary)) : null,
        h('div', { className: 'ps-art-meta' },
          h('span', null, file.split('/').pop()),
          e.size ? h('span', null, fmtSize(e.size)) : null,
          a.contract ? h('span', null, str(a.contractTitle || a.contract)) : null,
        ),
      )
    }),
  )
}

// OBV-01: an index entry's `file` resolves relative to the index.json's own
// directory, not the unit root. Compose the unit-root-relative path here.
function resolveArtifactPath(contract, entry) {
  const seg = str((entry && (entry.file || entry.path)) || '')
  if (!contract || !contract.indexPath || !seg) return seg
  const dir = String(contract.indexPath).split('/').slice(0, -1).join('/')
  return (dir ? dir + '/' : '') + seg
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

function psLogPanel(props) {
  return h('div', { className: 'ps-log-panel', style: { marginTop: 16 } },
    h('div', { className: 'ps-log-head', onClick: props.toggleLog },
      h('span', { style: { transition: 'transform 150ms', display: 'inline-block', transform: props.logOpen ? 'rotate(90deg)' : 'none' } }, '▶'),
      h('span', { style: { fontWeight: 600, fontSize: 15 } }, '运行日志'),
      h('span', { className: 'spacer', style: { flex: 1 } }),
      props.runStatus === 'running' || props.runStatus === 'queued' ? psBadge('running', '运行中') : null,
    ),
    props.logOpen ? h('div', { className: 'ps-log-body' },
      props.log && props.log.length ? props.log.map((e, i) => h('div', { key: i }, str(e))) :
        '暂无事件（MAS 未写 events.jsonl 或尚未运行）。',
      h('div', { className: 'ps-field', style: { marginBottom: 0 } },
        h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
          h(psInput, { value: props.intervene, onChange: (e) => props.setIntervene(e.target.value), placeholder: '向当前运行会话注入指令…', onKeyDown: (e) => { if (e.key === 'Enter') props.onIntervene() } }),
          h(psBtn, { primary: true, onClick: props.onIntervene, disabled: !props.intervene.trim() }, '注入'),
        ),
      ),
    ) : null,
  )
}