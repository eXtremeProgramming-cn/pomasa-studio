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

  function PomasaFooterAction() {
    const [open, setOpen] = React.useState(false)
    return h('div', null,
      h('div', { className: 'ps-footer-action', onClick: () => setOpen(!open) }, 'POMASA'),
      open ? h('div', { className: 'ps-app-overlay' },
        h('div', { className: 'ps-app-overlay-close' },
          h(psBtn, { onClick: () => setOpen(false) }, '关闭'),
        ),
        h(StudioRoot, { sessionId: 'global', key: 'global' }),
      ) : null,
    )
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
  }

  function StudioRoot(props) {
    const [route, setRoute] = React.useState('list')
    const [masId, setMasId] = React.useState(null)
    const apiRef = React.useRef(null)
    if (!apiRef.current) apiRef.current = createApi()
    const api = apiRef.current

    let page
    if (route === 'list') {
      page = h(MasList, {
        api,
        onCreate: () => setRoute('create'),
        onOpen: (id) => { setMasId(id); setRoute('detail') },
      })
    } else if (route === 'create') {
      page = h(CreateMas, {
        api,
        onCancel: () => setRoute('list'),
        onDone: (id) => { setMasId(id); setRoute(id ? 'detail' : 'list') },
      })
    } else {
      page = h(MasDetail, { api, masId, onBack: () => setRoute('list') })
    }
    return h(PsBoundary, null, page)
  }

  applySlots(slots, h)
}