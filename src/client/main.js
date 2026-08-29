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
          h('div', { className: 'ps-notice err' }, 'POMASA Studio 渲染失败：' + String((this.state.err && this.state.err.message) || this.state.err)),
          this.state.stack
            ? h('pre', { className: 'ps-pre', style: { fontSize: 12, overflow: 'auto', maxHeight: 320 } }, str(this.state.stack))
            : null,
          this.state.errStack
            ? h('pre', { className: 'ps-pre', style: { fontSize: 12, overflow: 'auto', maxHeight: 320 } }, str(this.state.errStack))
            : null,
          h(psBtn, { ghost: true, onClick: () => this.setState({ err: null, stack: null, errStack: null }) }, '重试'),
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
    return h('div', { className: 'ps-footer-action' + (open ? ' on' : ''), onClick: () => panel.toggle() }, 'POMASA')
  }

  function applySlots(slots, h2) {
    slots.inject('conversation.view', () => slots.register(
    { name: 'conversation.view', id: 'pomasa-studio', order: 30, label: 'POMASA' },
    (props) => h2(StudioRoot, { sessionId: props.sessionId, key: props.sessionId }),
  ))
    slots.inject('sidebar.footer.action', () => slots.register(
      { name: 'sidebar.footer.action', id: 'pomasa-studio', order: 20, label: 'POMASA' },
      () => h2(PomasaFooterAction, null),
    ))
    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'pomasa-studio', order: 10, label: 'POMASA' },
      () => h2(WorkbenchPanel, null),
    ))
  }

  function StudioRoot(props) {
    const [selectedId, setSelectedId] = React.useState(null)
    const [mode, setMode] = React.useState('browse') // 'browse' | 'create'
    const apiRef = React.useRef(null)
    if (!apiRef.current) apiRef.current = createApi()
    const api = apiRef.current

    const left = h(MasList, {
      api,
      selectedId,
      onCreate: () => setMode('create'),
      onSelect: (id) => { setSelectedId(id); setMode('browse') },
      onDelete: (id) => { if (selectedId === id) setSelectedId(null) },
    })

    let right
    if (mode === 'create') {
      right = h(CreateMas, {
        api,
        onCancel: () => setMode('browse'),
        onDone: (id) => { setSelectedId(id || null); setMode('browse') },
      })
    } else if (selectedId) {
      right = h(MasDetail, { api, masId: selectedId })
    } else {
      right = h('div', { className: 'ps-empty-pane' },
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 460 } },
          h(psEmpty, { title: '选择或创建一个 MAS', hint: '从左侧导航选择一个研究系统，查看其运行状态与产物。' }),
          h(psBtn, { primary: true, onClick: () => setMode('create') }, '新建 MAS'),
        ),
      )
    }

    return h(PsBoundary, null, h('div', { className: 'ps-workbench' }, left, right))
  }

  applySlots(slots, h)
}