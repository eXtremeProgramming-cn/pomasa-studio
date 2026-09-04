// Small building blocks on top of DSW alias tokens.
// Convention: components take a props object and read children from
// props.children (React-invoked) OR from a positional second arg (direct JS
// calls like psField({label}, child)). `k()` resolves both.
function k(props, children) {
  // React's server renderer passes an empty object {} as the 2nd arg to
  // function components; treat it as "not provided".
  if (children && typeof children === 'object' && !Array.isArray(children) && !children.$$typeof && Object.keys(children).length === 0) {
    return props && props.children
  }
  if (children !== undefined && children !== null) return children
  return props && props.children
}

function psCard(props, children) {
  const cls = ['ps-card']
  if (props.className) cls.push(props.className)
  const rest = Object.assign({}, props)
  delete rest.children
  delete rest.className
  return h('div', Object.assign({}, rest, { className: cls.join(' ') }), k(props, children))
}

function psBtn(props, children) {
  const cls = ['ps-btn']
  if (props.primary) cls.push('primary')
  if (props.ghost) cls.push('ghost')
  if (props.className) cls.push(props.className)
  const rest = Object.assign({}, props)
  delete rest.primary
  delete rest.ghost
  delete rest.children
  delete rest.className
  return h('button', Object.assign({}, rest, { className: cls.join(' '), type: props.type || 'button' }), k(props, children))
}

function psBadge(props, children) {
  const status = (typeof props === 'string' ? props : props.status) || 'idle'
  return h('span', { className: 'ps-badge ' + status },
    h('span', { className: 'dot' }),
    k(props, children),
  )
}

function psEmpty(props, children) {
  const kc = k(props, children)
  let title, hint
  if (typeof props === 'string') {
    title = props
    hint = Array.isArray(kc) ? kc[0] : kc
  } else {
    title = props.title
    hint = props.hint !== undefined ? props.hint : (Array.isArray(kc) ? kc[0] : kc)
  }
  return h('div', { className: 'ps-empty' },
    h('img', { className: 'ps-meme', src: MASA_MEME_URL, alt: '', draggable: false, onError: (e) => { if (e && e.currentTarget) e.currentTarget.src = MASA_MEME } }),
    h('div', { className: 'ps-empty-title' }, title),
    hint ? h('div', { className: 'ps-muted' }, hint) : null,
  )
}

function psField(props, children) {
  return h('div', { className: 'ps-field' },
    props.label ? h('label', null, props.label) : null,
    k(props, children),
    props.hint ? h('div', { className: 'hint' }, props.hint) : null,
  )
}

function psInput(props) {
  const rest = Object.assign({}, props)
  delete rest.children
  return h('input', Object.assign({ className: 'ps-input' }, rest))
}

function psTextarea(props) {
  const rest = Object.assign({}, props)
  delete rest.children
  return h('textarea', Object.assign({ className: 'ps-textarea' }, rest))
}

const MAS_STATUS_TEXT = { idle: () => t('st.idle'), running: () => t('st.running'), generating: () => t('st.generating'), 'gen-failed': () => t('st.gen-failed'), 'run-failed': () => t('st.run-failed'), completed: () => t('st.completed'), failed: () => t('st.failed') }
const MAS_STATUS_BADGE = { idle: 'idle', running: 'running', generating: 'generating', 'gen-failed': 'failed', 'run-failed': 'failed', completed: 'completed', failed: 'failed' }
const STAGE_STATUS_TEXT = { waiting: () => t('stage.waiting'), active: () => t('stage.active'), completed: () => t('stage.completed'), failed: () => t('stage.failed'), skipped: () => t('stage.skipped'), aborted: () => t('stage.aborted') }
const STAGE_STATUS_BADGE = { waiting: 'idle', active: 'running', completed: 'completed', failed: 'failed', skipped: 'idle', aborted: 'err' }

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}