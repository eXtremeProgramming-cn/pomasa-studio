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
              h(psBtn, {
                ghost: true,
                className: 'ps-btn-danger',
                style: { padding: '3px 10px', fontSize: 13 },
                title: '删除此 MAS',
                onClick: (e) => {
                  e.stopPropagation()
                  const name = str(m.name || m.id)
                  if (window.confirm(`确定删除 MAS「${name}」吗？\n这会删除 ${str(m.id)} 的全部运行产物与注册，不可恢复。`)) {
                    api.deleteMas(m.id).then((r) => { if (r && r.ok) refresh(); else setError((r && r.error) || '删除失败') })
                  }
                },
              }, '删除'),
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
        stillWorking
          ? h('div', { className: 'ps-caption', style: { marginTop: 14 } }, '完整生成会话与思考过程请到 DSH 侧栏打开该会话，用"对话 / 轨迹"查看。')
          : null,
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
        h(psBtn, {
          className: 'ps-btn-danger',
          style: { borderColor: 'var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)' },
          onClick: () => {
            if (window.confirm('确定要取消当前运行会话吗？已产生的产物会保留。')) {
              api.cancelRun(masId, unit).then(() => refresh())
            }
          },
        }, '取消运行') : null,
      runStatus === 'running' || runStatus === 'queued'
        ? h(psBtn, { disabled: true }, '运行中…')
        : h(psBtn, { primary: true, disabled: busy, onClick: () => startRun(Array.isArray(units) ? units.filter((u) => !u.run).map((u) => u.key) : []) }, '运行'),
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
      stages.map((s) => {
        const agentFile = descriptor ? ((descriptor.stages || []).find((x) => x.index === s.index) || {}).agent : null
        return h('div', { key: s.index, className: 'ps-stage' + (s.index === stageIdx ? ' on' : ''), onClick: () => { setStageSel(stages.indexOf(s)); setArtifact(null); setViewer(null) } },
          h('div', { className: 'ps-stage-on', style: { background: stageColor(s.status) } }),
          h('div', {
            className: 'ps-stage-name',
            title: agentFile ? '查看蓝图 ' + str(agentFile) : undefined,
            onClick: (e) => {
              e.stopPropagation()
              setBp({ title: str(s.title), path: agentFile ? String(agentFile) : '', index: s.index })
            },
          }, str(s.title)),
          h('div', { className: 'ps-stage-count' }, stageCountText(s)),
        )
      }),
    ),

    h('div', { className: 'ps-panel' },
      stage ? h('div', { key: 'stage-' + str(stageIdx) },
        stageContractCards(stage, unit, api, openArtifact, artifact),
      ) : h(psEmpty, { title: '选择阶段' }),

      viewer ? h('div', { className: 'ps-viewer', style: { marginTop: 20 } },
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
      ) : null,
    ),

    bp ? h(BlueprintModal, { api, masId, path: bp.path, title: bp.title, stage: bp.index, onClose: () => setBp(null) }) : null,
  )
}

function BlueprintModal(props) {
  const [data, setData] = React.useState(null)
  const [err, setErr] = React.useState(null)
  React.useEffect(() => {
    let stop = false
    props.api.blueprintRead(props.masId, props.path, props.stage)
      .then((r) => { if (!stop) { if (r.ok) setData(r); else setErr(r.error || '读取失败') } })
      .catch((e) => { if (!stop) setErr(String(e && e.message || e)) })
    return () => { stop = true }
  }, [props.masId, props.path, props.api])
  return h('div', { className: 'ps-modal-backdrop', onClick: props.onClose },
    h('div', { className: 'ps-modal', onClick: (e) => e.stopPropagation() },
      h('div', { className: 'ps-modal-head' },
        h('span', { style: { fontWeight: 600, fontSize: 15 } }, str(props.title) + ' · 蓝图'),
        h('span', { className: 'spacer', style: { flex: 1 } }),
        h(psBtn, { ghost: true, onClick: props.onClose }, '✕'),
      ),
      h('div', { className: 'ps-modal-body' },
        err ? h('div', { className: 'ps-muted' }, err)
          : data === null ? h('div', { className: 'ps-muted' }, '加载中…')
          : data.format === 'markdown' ? renderMarkdown(String(data.content || ''))
          : data.format === 'json' ? h('pre', { className: 'ps-pre' }, prettyJson(String(data.content || '')))
          : h('pre', { className: 'ps-pre' }, String(data.content || '')),
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
  const seen = new Set()
  for (const c of stage.contracts) {
    const entries = Array.isArray(c.index) ? c.index : []
    for (const e of entries || []) {
      if (!e || typeof e !== 'object') continue
      // Several contracts may share one index.json (the generator emits both a
      // summary and a questions contract over the same file); dedupe entries so
      // each artifact renders exactly once.
      const key = String(c.indexPath || '') + '|' + String(e.id || e.file || e.path || JSON.stringify(e))
      if (seen.has(key)) continue
      seen.add(key)
      // Attribute an entry to the contract whose artifact id matches its id
      // when one exists; otherwise to the contract that listed it first.
      const matched = e.id != null
        ? stage.contracts.find((x) => x.id != null && String(x.id) === String(e.id))
        : undefined
      const owner = matched || c
      all.push({ contract: owner.id, contractTitle: owner.title, entry: e, path: resolveArtifactPath(owner, e) })
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
