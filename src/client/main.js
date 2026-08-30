// Client entry — bundled to lib/client.js by scripts/bundle-client.mjs.
// Entries: conversation.view (a session tab beside Chat / Trajectory) plus a
// sidebar.footer.action that opens the Studio as a full-screen overlay, so the
// workbench is reachable without opening a session.
export const inject = ['slots']

export function apply(ctx) {
  const slots = ctx.get('slots')
  if (slots === undefined) return

  if (typeof document !== 'undefined') {
    const id = 'pomasa-studio-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = CSS
      document.head.appendChild(el)
    }
  }

  function PsBoundary(props) {
    return h(BoundaryImpl, null, props.children ? React.Children.toArray(props.children) : null)
  }

  class BoundaryImpl extends React.Component {
    constructor(props) {
      super(props)
      this.state = { err: null, stack: null, errStack: null }
    }
    static getDerivedStateFromError(err) {
      return { err }
    }
    componentDidCatch(err, info) {
      console.error('pomasa-studio render error:', err, info && info.componentStack)
      this.setState({ errStack: err && err.stack })
      if (info && info.componentStack) this.setState({ stack: info.componentStack })
    }
    render() {
      if (this.state.err) {
        return h('div', { className: 'ps-page' },
          h('div', { className: 'ps-notice err' }, t('boundary.fail') + String((this.state.err && this.state.err.message) || this.state.err)),
          this.state.stack
            ? h('pre', { className: 'ps-pre', style: { fontSize: 12, overflow: 'auto', maxHeight: 320 } }, str(this.state.stack))
            : null,
          this.state.errStack
            ? h('pre', { className: 'ps-pre', style: { fontSize: 12, overflow: 'auto', maxHeight: 320 } }, str(this.state.errStack))
            : null,
          h(psBtn, { ghost: true, onClick: () => this.setState({ err: null, stack: null, errStack: null }) }, t('retry')),
        )
      }
      return this.props.children
    }
  }

  // The footer toggles a workbench panel rendered through the DSH shell.overlay
  // layer. The panel is BOUNDED to the center column (a transparent spacer keeps
  // the sidebar width free), so the session tree and conversations stay visible
  // and clickable — no full-screen takeover, reachable on ANY screen state
  // (including brand-new blank sessions where conversation.view tabs don't
  // render yet).
  const panel = {
    open: false,
    subs: new Set(),
    emit() { for (const fn of this.subs) fn() },
    toggle() { this.open = !this.open; this.emit() },
    subscribe(fn) { this.subs.add(fn); return () => { this.subs.delete(fn) } },
  }

  function usePanelOpen() {
    if (typeof React.useSyncExternalStore === 'function') {
      return React.useSyncExternalStore(panel.subscribe.bind(panel), () => panel.open)
    }
    const [v, setV] = React.useState(panel.open)
    React.useEffect(() => panel.subscribe(() => setV(panel.open)), [])
    return v
  }

  // Rendered inside shell.overlay while open. Root is a click-through full-frame
  // flex row; only the panel opts back into pointer events, and the left spacer
  // mirrors the sidebar width so the session list stays usable beneath it.
  function WorkbenchPanel() {
    const open = usePanelOpen()
    if (!open) return null
    return h('div', { className: 'ps-shell-root' },
      h('div', { className: 'ps-shell-nav' }),
      h('div', { className: 'ps-shell-panel' },
        h(StudioRoot, { sessionId: '', key: 'shell' }),
      ),
    )
  }

  function PomasaFooterAction() {
    const open = usePanelOpen()
    useLang() // re-render when the language changes while the panel is closed
    return h('div', {
      className: 'ps-footer-action' + (open ? ' on' : ''),
      onClick: () => panel.toggle(),
      title: open ? t('launcher.close') : t('launcher.open'),
      'aria-expanded': open ? 'true' : 'false',
    }, h('span', { className: 'ps-footer-glyph' }, '◫'), t('studio.title'))
  }

  // Giving every pomasa session its "POMASA" workspace folder is done through
  // the CLIENT workspaces service: it round-trips via the apiserver to the host
  // registry and persists the workspace.sessionIds membership (poking
  // ctx.workspaceRegistry directly from a plugin is unreliable across profiles).
  // The service may not be mounted when the plugin applies, and sessions can
  // register after load, so this self-retries with backoff (bounded).
  async function ensurePomasaWorkspaceClient(attempt = 0) {
    let svc
    try { svc = ctx.get('workspaces') } catch { svc = null }
    const retry = () => {
      if (attempt < 6) setTimeout(() => { ensurePomasaWorkspaceClient(attempt + 1) }, 2500)
    }
    if (!svc || typeof svc.create !== 'function') return retry()
    let meta = null
    try { meta = await (await fetch('/pomasa/meta')).json() } catch { return retry() }
    if (!meta || !meta.ok || !meta.home) return retry()
    const readItems = () => {
      try {
        const snap = svc.list && typeof svc.list.getSnapshot === 'function' ? svc.list.getSnapshot() : null
        return snap && Array.isArray(snap.items) ? snap.items : []
      } catch { return [] }
    }
    const findWs = (items) =>
      items.find((w) => (w && String(w.path || w.cwd || '') === meta.home))
      || items.find((w) => (w && (w.title || '') === 'POMASA'))
      || items.find((w) => (w && String(w.path || w.cwd || '').split('/').pop() === '.pomasa')) || null
    let ws = findWs(readItems())
    try {
      if (!ws) {
        const created = await svc.create({ path: meta.home })
        ws = (created && created.workspaceId) ? created : findWs(readItems())
      }
      if (ws && (ws.title || '') !== 'POMASA' && typeof svc.rename === 'function') {
        try {
          const rn = await svc.rename(ws.workspaceId ?? ws.id, 'POMASA')
          ws = rn?.workspace ?? rn ?? ws
        } catch { /* cosmetic */ }
      }
    } catch { return retry() }
    // Session accounting happens on the HOST via workspace.attachSession()
    // (createAgentSession); there is no client RPC for it, so the client only
    // guarantees the POMASA workspace folder exists and is titled correctly.
    if (!ws) retry()
  }

  function applySlots(slots, h2) {
    // Single entry: the bottom-left launcher toggles the shell.overlay
    // workbench panel. The in-session conversation.view tab was removed — the
    // panel is reachable on any screen state, so the tab added nothing.
    slots.inject('sidebar.footer.action', () => slots.register(
      { name: 'sidebar.footer.action', id: 'pomasa-studio', order: 20, label: t('studio.title') },
      () => h2(PomasaFooterAction, null),
    ))
    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'pomasa-studio', order: 10, label: t('studio.title') },
      () => h2(WorkbenchPanel, null),
    ))
  }

  // Session ids created by the client drive for each MAS, so cancel/intervene
  // can target them through the sessions service.
  const lastRunSession = new Map() // masId -> sessionId (most recent run)

  // Cancel the most recent run session for a MAS via the DSH sessions service.
  async function cancelRunSession(masId) {
    const sid = lastRunSession.get(masId)
    if (!sid) return { ok: true }
    try {
      const sessionsSvc = ctx.get('sessions')
      const bound = sessionsSvc && typeof sessionsSvc.binding === 'function' ? sessionsSvc.binding(sid) : null
      if (bound && bound.session && typeof bound.session.cancel === 'function') {
        await bound.session.cancel('user')
      }
    } catch { /* best-effort */ }
    return { ok: true }
  }

  // Direction-1 driver: create the run/gen SESSION through the workspace flow
  // (workspaces.connectWorkspace -> accounted in the POMASA workspace, exactly
  // like the sidebar's New Session), drive it with sessions.prompt, and record
  // the session id so the host status machine follows it. Returns { ok } or an
  // error; the session appears under POMASA in the DSH sidebar.
  async function driveSession(kind, masId, unit, prompt) {
    const workspacesSvc = ctx.get('workspaces')
    const sessionsSvc = ctx.get('sessions')
    if (!workspacesSvc || !sessionsSvc || typeof workspacesSvc.connectWorkspace !== 'function') {
      return { ok: false, error: t('err.ws.svc') }
    }
    let meta = null
    try { meta = await (await fetch('/pomasa/meta')).json() } catch { /* ignore */ }
    const home = meta && meta.ok ? meta.home : null
    const readItems = () => {
      try {
        const snap = workspacesSvc.list && typeof workspacesSvc.list.getSnapshot === 'function' ? workspacesSvc.list.getSnapshot() : null
        return snap && Array.isArray(snap.items) ? snap.items : []
      } catch { return [] }
    }
    let ws = null
    if (home) ws = readItems().find((w) => (w && String(w.path || w.cwd || '') === home)) || null
    if (!ws) ws = readItems().find((w) => (w && (w.title || '') === 'POMASA')) || null
    if (!ws && typeof workspacesSvc.create === 'function' && home) {
      try {
        const created = await workspacesSvc.create({ path: home })
        ws = (created && created.workspaceId) ? created : null
      } catch { /* ignore */ }
    }
    if (!ws) return { ok: false, error: t('err.ws.home') }
    let sessionId
    try { sessionId = await workspacesSvc.connectWorkspace(ws.workspaceId) }
    catch (e) { return { ok: false, error: t('err.ws.create', { m: String(e && e.message || e) }) } }
    try {
      const bound = typeof sessionsSvc.binding === 'function' ? sessionsSvc.binding(sessionId) : null
      const sess = bound && bound.session
      if (sess && typeof sess.prompt === 'function') {
        await sess.prompt([{ type: 'text', text: String(prompt || '') }], 'queue')
      } else {
        return { ok: false, error: t('err.ws.no.prompt') }
      }
    } catch (e) { return { ok: false, error: t('err.ws.start', { m: String(e && e.message || e) }) } }
    try { await fetch('/pomasa/record', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ masId, kind, unit: unit || 'single', sessionId }) }) } catch { /* best-effort */ }
    if (kind === 'run') lastRunSession.set(masId, sessionId)
    return { ok: true, sessionId }
  }

  function StudioRoot(props) {
    useLang() // whole workbench re-renders when the language changes
    const [selectedId, setSelectedId] = React.useState(null)
    const [mode, setMode] = React.useState('browse') // 'browse' | 'create'
    const [masCount, setMasCount] = React.useState(null) // null = list not loaded yet
    const apiRef = React.useRef(null)
    if (!apiRef.current) apiRef.current = createApi()
    const api = apiRef.current

    const left = h(MasList, {
      api,
      selectedId,
      onCreate: () => setMode('create'),
      onSelect: (id) => { setSelectedId(id); setMode('browse') },
      onDelete: (id) => { if (selectedId === id) setSelectedId(null) },
      onListChange: setMasCount,
    })

    let right
    if (mode === 'create') {
      right = h(CreateMas, {
        api,
        onCancel: () => setMode('browse'),
        onDone: (id) => { setSelectedId(id || null); setMode('browse') },
        onGeneration: (masId, prompt) => driveSession('gen', masId, 'single', prompt),
      })
    } else if (selectedId) {
      right = h(MasDetail, { api, masId: selectedId, onRun: (masId, unit, prompt) => driveSession('run', masId, unit, prompt), onCancelRun: (masId) => cancelRunSession(masId) })
    } else if (masCount === 0) {
      // first open, nothing exists yet: an onboarding hero — the create action
      // lives only in the left nav head
      right = h('div', { className: 'ps-empty-hero' },
        h('div', { className: 'ps-hero-glyph' }, '◌'),
        h('h2', null, t('hero.first.title')),
        h('p', null, t('hero.first.desc')),
        h('span', { className: 'ps-caption' }, t('hero.ai.note')),
      )
    } else {
      // MASes exist, none selected
      right = h('div', { className: 'ps-empty-hero quiet' },
        h('img', { className: 'ps-meme', src: MASA_MEME, alt: '', draggable: false }),
        h('h2', null, t('hero.choose.title')),
        h('p', null, t('hero.choose.desc')),
      )
    }

    return h(PsBoundary, null, h('div', { className: 'ps-workbench' }, left, right))
  }

  applySlots(slots, h)
  ensurePomasaWorkspaceClient().catch(() => { /* best-effort */ })
}