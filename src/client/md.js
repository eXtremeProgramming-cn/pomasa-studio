// Minimal markdown renderer for the artifact viewer.
// Outputs React elements only — never innerHTML — so artifact content cannot inject markup.
// Supports: fenced code, headings 1-4, hr, blockquote, lists, simple tables, paragraphs,
// and inline **bold** / *em* / `code` / [link](url).
function renderMarkdown(md) {
  if (typeof md !== 'string') return []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const nodes = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i += 1; continue }
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const lang = fence[1]
      const buf = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i += 1 }
      i += 1
      nodes.push(h('pre', { key: nodes.length, className: 'ps-pre' }, h('code', { key: 'c', className: lang ? 'lang-' + lang : '' }, buf.join('\n'))))
      continue
    }
    const hm = line.match(/^(#{1,4})\s+(.*)$/)
    if (hm) {
      const level = hm[1].length
      nodes.push(h('h' + level, { key: nodes.length }, inline(hm[2].trim())))
      i += 1
      continue
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { nodes.push(h('hr', { key: nodes.length })); i += 1; continue }
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1 }
      nodes.push(h('blockquote', { key: nodes.length }, inline(buf.join('\n'))))
      continue
    }
    const ordered = /^\s*\d+\.\s+/
    if (/^\s*[-*]\s+/.test(line) || ordered.test(line)) {
      const items = []
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || ordered.test(lines[i]))) {
        items.push(inline(ordered.test(lines[i]) ? lines[i].replace(ordered, '') : lines[i].replace(/^\s*[-*]\s+/, '')))
        i += 1
      }
      nodes.push(h(ordered.test(line) ? 'ol' : 'ul', { key: nodes.length }, items.map((it, idx) => h('li', { key: idx }, it))))
      continue
    }
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s:| -]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('|')) {
      const rows = []
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|')
        if (cells[0].trim() === '') cells.shift()
        if (cells[cells.length - 1].trim() === '') cells.pop()
        rows.push(cells.map((c) => c.trim()))
        i += 1
      }
      const header = rows[0] || []
      const body = rows.slice(1)
      nodes.push(
        h('table', { key: nodes.length },
          h('thead', { key: 'h' }, h('tr', { key: 'r' }, header.map((c, idx) => h('th', { key: idx }, inline(c))))),
          h('tbody', { key: 'b' }, body.map((row, ri) => h('tr', { key: ri }, row.map((c, ci) => h('td', { key: ci }, inline(c)))))),
        ),
      )
      continue
    }
    const buf = [line]
    i += 1
    while (i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])) {
      buf.push(lines[i])
      i += 1
    }
    nodes.push(h('p', { key: nodes.length }, inline(buf.join('\n'))))
  }
  return nodes
}

const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g
function inline(text) {
  const parts = String(text).split(INLINE_RE)
  const out = []
  for (let idx = 0; idx < parts.length; idx += 1) {
    const p = parts[idx]
    if (!p) continue
    if (/^\*\*[^*]+\*\*$/.test(p)) { out.push(h('strong', { key: idx }, p.slice(2, -2))); continue }
    if (/^`[^`]+`$/.test(p)) { out.push(h('code', { key: idx, className: 'ps-code' }, p.slice(1, -1))); continue }
    if (/^\*[^*]+\*$/.test(p)) { out.push(h('em', { key: idx }, p.slice(1, -1))); continue }
    const lm = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (lm) { out.push(h('a', { key: idx, href: lm[2], target: '_blank', rel: 'noreferrer' }, lm[1])); continue }
    out.push(p)
  }
  return out
}