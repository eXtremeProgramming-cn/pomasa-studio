// Pure-JS markdown → docx export.
//
//   docx: markdown-it tokens → `docx` library (CJK-safe, everything is OOXML).
//
// PDF export was pulled out in 0.2.2: the pure-Node engines we tried (pdfmake,
// pdfkit, jsPDF+autotable) did not meet typography expectations, and the md
// itself remains the deliverable. A future, better-engine PDF export can be
// re-added without touching this module.
//
// The md is STR-08 pandoc-ready. Footnotes render as raised [n] references
// plus a trailing Notes section.
import MarkdownIt from 'markdown-it'
import mditFootnote from 'markdown-it-footnote'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx'

const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false }).use(mditFootnote)

/** Build TextRuns (with basic bold/italic/code) from an inline token array. */
function inlineRuns(tokens, state) {
  const runs = []
  let bold = false
  let italic = false
  for (const tok of tokens || []) {
    if (tok.type === 'strong_open') { bold = true; continue }
    if (tok.type === 'strong_close') { bold = false; continue }
    if (tok.type === 'em_open') { italic = true; continue }
    if (tok.type === 'em_close') { italic = false; continue }
    if (tok.type === 'code_inline') { runs.push(new TextRun({ text: tok.content, bold, italics: italic, font: 'Courier New', size: 20 })); continue }
    if (tok.type === 'text' || tok.type === 'code_inline' || tok.type === 'html_inline') {
      runs.push(new TextRun({ text: tok.content, bold, italics: italic, size: 22 }))
      continue
    }
    if (tok.type === 'footnote_ref') { runs.push(new TextRun({ text: '[' + tok.meta.id + ']', superScript: true, size: 18 })); continue }
    if (tok.children) runs.push(...inlineRuns(tok.children, state))
  }
  return runs
}

/** Collect footnote definitions { id -> plain text }. */
function collectFootnotes(tokens, state) {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.type === 'footnote_ref') state.footnoteRefs.add(String(tok.meta.id))
    if (tok.type === 'footnote_open') {
      const id = tok.meta.id
      const body = []
      while (i + 1 < tokens.length && tokens[i + 1].type !== 'footnote_close') { body.push(tokens[i + 1]); i++ }
      i++
      const html = md.renderer.render(body, md.options, {})
      state.footnotes[id] = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  }
}

/** Walk block tokens and emit docx blocks. */
function tokensToDocx(tokens) {
  const state = { footnotes: {}, footnoteRefs: new Set() }
  const blocks = []
  const listStack = []
  let orderedCounter = 1
  collectFootnotes(tokens, state)

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    switch (t.type) {
      case 'heading_open': {
        const inline = tokens[i + 1]
        blocks.push(new Paragraph({ children: inlineRuns(inline.children || [], {}), heading: HeadingLevel['HEADING_' + Math.min(t.tag[1], 6)] }))
        i += 2
        break
      }
      case 'paragraph_open': {
        if (listStack.length) break // list item paragraphs are handled by the item branch
        const inline = tokens[i + 1]
        blocks.push(new Paragraph({ children: inlineRuns(inline.children || [], {}), spacing: { after: 120 } }))
        i += 2
        break
      }
      case 'bullet_list_open': listStack.push('bullet'); break
      case 'ordered_list_open': listStack.push('ordered'); orderedCounter = 1; break
      case 'bullet_list_close':
      case 'ordered_list_close': listStack.pop(); orderedCounter = 1; break
      case 'list_item_open': {
        const items = []
        while (i + 1 < tokens.length && tokens[i + 1].type !== 'list_item_close') {
          if (tokens[i + 1].type === 'paragraph_open') {
            const inline = tokens[i + 2]
            if (inline) items.push(inlineRuns(inline.children || [], {}))
            i += 2
          }
          i++
        }
        i++
        const level = listStack.length - 1
        const kind = listStack[listStack.length - 1]
        for (let k = 0; k < items.length; k++) {
          const prefix = kind === 'ordered'
            ? new TextRun({ text: `${orderedCounter++}. `, size: 22 })
            : new TextRun({ text: '• ', size: 22 })
          blocks.push(new Paragraph({ children: [prefix, ...items[k]], indent: { left: 360 * (level + 1) }, spacing: { after: 60 } }))
        }
        break
      }
      case 'table_open': {
        const rows = []
        while (i < tokens.length && tokens[i].type !== 'table_close') {
          if (tokens[i].type === 'tr_open') {
            const cells = []
            i++
            while (i < tokens.length && tokens[i].type !== 'tr_close') {
              if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
                const inline = tokens[i + 1]
                cells.push(new TableCell({ children: [new Paragraph({ children: inlineRuns((inline && inline.children) || [], {}) })] }))
                i += 2
              } else i++
            }
            rows.push(new TableRow({ children: cells }))
          }
          i++
        }
        blocks.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }))
        blocks.push(new Paragraph({ text: '' }))
        break
      }
      case 'fence':
      case 'code_block': {
        blocks.push(new Paragraph({ children: [new TextRun({ text: t.content, font: 'Courier New', size: 18 })], indent: { left: 480 }, spacing: { after: 120 } }))
        break
      }
      case 'blockquote_open': {
        const inline = tokens[i + 1]
        blocks.push(new Paragraph({ children: inlineRuns(inline.children || [], {}), indent: { left: 720 }, spacing: { after: 120 } }))
        i += 2
        break
      }
      default: break
    }
  }

  if (Object.keys(state.footnotes).length) {
    blocks.push(new Paragraph({ children: [new TextRun({ text: 'Notes', bold: true, size: 22 })], spacing: { before: 240, after: 80 } }))
    for (const id of Object.keys(state.footnotes).sort((a, b) => a - b)) {
      blocks.push(new Paragraph({ children: [new TextRun({ text: `[${id}] ${state.footnotes[id]}`, size: 20 })], spacing: { after: 60 } }))
    }
  }
  return blocks
}

/** Convert a markdown string to a .docx Buffer. */
export async function mdToDocx(content) {
  const tokens = md.parse(String(content || ''), {})
  const doc = new Document({ sections: [{ children: tokensToDocx(tokens) }] })
  return Buffer.from(await Packer.toBuffer(doc))
}

/** @deprecated PDF export removed in 0.2.2 — kept exported so tests/users get a clear error. */
export async function mdToPdf() {
  throw new Error('PDF export was removed in 0.2.2; use DOCX or the Markdown source')
}