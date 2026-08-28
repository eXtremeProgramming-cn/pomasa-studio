// Client entry — bundled to lib/client.js by scripts/bundle-client.mjs.
// Slot: conversation.view (a session tab beside Chat / Trajectory).
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

  slots.inject('conversation.view', () => slots.register(
    { name: 'conversation.view', id: 'pomasa-studio', order: 30, label: 'POMASA' },
    (props) => h(StudioRoot, { sessionId: props.sessionId, key: props.sessionId }),
  ))
}