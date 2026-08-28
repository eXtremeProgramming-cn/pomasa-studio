// Small building blocks on top of DSW alias tokens. All pure functions.
function psCard(props, children) {
  return h('div', Object.assign({ className: 'ps-card' }, props), children)
}

function psBtn(props, label) {
  const cls = ['ps-btn']
  if (props.primary) cls.push('primary')
  if (props.ghost) cls.push('ghost')
  if (props.className) cls.push(props.className)
  const rest = Object.assign({}, props)
  delete rest.primary
  delete rest.ghost
  return h('button', Object.assign({}, rest, { className: cls.join(' '), type: rest.type || 'button' }), label)
}

function psBadge(status, text) {
  return h('span', { className: 'ps-badge ' + (status || 'idle') },
    h('span', { className: 'dot' }),
    text,
  )
}

function psEmpty(title, hint) {
  return h('div', { className: 'ps-empty' },
    h('div', { className: 'ps-empty-glyph' }, '▫'),
    h('div', { className: 'ps-empty-title' }, title),
    hint ? h('div', { className: 'ps-muted' }, hint) : null,
  )
}

function psField(props, children) {
  return h('div', { className: 'ps-field' },
    props.label ? h('label', null, props.label) : null,
    children,
    props.hint ? h('div', { className: 'hint' }, props.hint) : null,
  )
}

function psInput(props) {
  return h('input', Object.assign({ className: 'ps-input' }, props))
}

function psTextarea(props) {
  return h('textarea', Object.assign({ className: 'ps-textarea' }, props))
}

const MAS_STATUS_TEXT = { idle: '空闲', running: '运行中', generating: '生成中', failed: '失败' }
const MAS_STATUS_BADGE = { idle: 'idle', running: 'running', generating: 'generating', failed: 'failed' }
const STAGE_STATUS_TEXT = { waiting: '等待', active: '运行中', completed: '完成', failed: '失败', skipped: '跳过', aborted: '中止' }
const STAGE_STATUS_BADGE = { waiting: 'idle', active: 'running', completed: 'completed', failed: 'failed', skipped: 'idle', aborted: 'err' }

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}