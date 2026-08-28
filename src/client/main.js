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

  function StudioRoot(props) {
    const [route, setRoute] = React.useState('list')
    const [masId, setMasId] = React.useState(null)
    const apiRef = React.useRef(null)
    if (!apiRef.current) apiRef.current = createApi()
    const api = apiRef.current

    if (route === 'list') {
      return h(MasList, {
        api,
        onCreate: () => setRoute('create'),
        onOpen: (id) => { setMasId(id); setRoute('detail') },
      })
    }
    if (route === 'create') {
      return h(CreateMas, {
        api,
        onCancel: () => setRoute('list'),
        onDone: (id) => { setMasId(id); setRoute(id ? 'detail' : 'list') },
      })
    }
    return h(MasDetail, { api, masId, onBack: () => setRoute('list') })
  }

  slots.inject('conversation.view', () => slots.register(
    { name: 'conversation.view', id: 'pomasa-studio', order: 30, label: 'POMASA' },
    (props) => h(StudioRoot, { sessionId: props.sessionId, key: props.sessionId }),
  ))
}