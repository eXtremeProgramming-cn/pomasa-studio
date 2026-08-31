// Pure-JS markdown → docx/pdf export (no pandoc, no system binaries).
//
//   docx: markdown-it tokens → `docx` library  (CJK-safe, everything is OOXML)
//   pdf:  markdown-it → HTML → html-to-pdfmake → pdfmake, with a bundled CJK
//         font (DroidSansFallbackFull.ttf, Apache-2.0) so Chinese renders.
//
// The md is STR-08 pandoc-ready; the builders aim for faithful-enough output,
// not a typesetting engine. Footnotes render as superscript references plus a
// trailing notes section.
import fs from 'node:fs'
import path from 'node:path'
import MarkdownIt from 'markdown-it'
import mditFootnote from 'markdown-it-footnote'
import PDFDocument from 'pdfkit'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx'

const FONT_FILE = path.resolve(new URL('../../../assets/fonts/DroidSansFallbackFull.ttf', import.meta.url).pathname)
const FONT_NAME = 'DroidSansFallback'

const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false }).use(mditFootnote)

let fontB64 = null
function cjkFontB64() {
  if (fontB64 === null) fontB64 = fs.readFileSync(FONT_FILE).toString('base64')
  return fontB64
}

/* ---------------- DOCX (tokens -> docx blocks) ---------------- */

/** Build TextRuns (with basic bold/italic/code) from an inline token array. */
function inlineRuns(tokens, state) {
  const runs = []
  let bold = false
  let italic = false
  let code = false
  for (const tok of tokens) {
    if (tok.type === 'strong_open') { bold = true; continue }
    if (tok.type === 'strong_close') { bold = false; continue }
    if (tok.type === 'em_open') { italic = true; continue }
    if (tok.type === 'em_close') { italic = false; continue }
    if (tok.type === 'code_inline') { runs.push(new TextRun({ text: tok.content, bold, italics: italic, font: 'Courier New', size: 20 })); continue }
    if (tok.type === 'text' || tok.type === 'code_inline' || tok.type === 'html_inline') {
      runs.push(new TextRun({ text: tok.content, bold, italics: italic, size: 22 }))
      continue
    }
    if (tok.type === 'footnote_ref') {
      runs.push(new TextRun({ text: '[' + tok.meta.id + ']', superScript: true, size: 18 }))
      continue
    }
    // links and other inline kinds: fall through to the nested content
    if (tok.children) runs.push(...inlineRuns(tok.children, state))
  }
  return runs
}

/** Extract footnote definitions: { id -> markdown } into state, consumed at end. */
function collectFootnotes(tokens, state) {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (tok.type === 'footnote_ref') state.footnoteRefs.add(String(tok.meta.id))
    if (tok.type === 'footnote_open') {
      const id = tok.meta.id
      const body = []
      while (i + 1 < tokens.length && tokens[i + 1].type !== 'footnote_close') {
        body.push(tokens[i + 1]); i++
      }
      i++ // skip footnote_close
      const text = md.renderer.render(body, md.options, {})
      state.footnotes[id] = text.replace(/<\/?[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  }
}

/** Walk block tokens and emit docx blocks. */
function tokensToDocx(tokens) {
  const state = { footnotes: {}, footnoteRefs: new Set() }
  const blocks = []
  let listLevel = 0
  let orderedCounter = 0
  let listStack = [] // 'bullet' | 'ordered'

  const pushInlineBlock = (tok) => {
    const children = []
    const findInline = (t) => t.type === 'inline' ? t : (t.children ? t.children : [])
    children.push(...findInline(tok))
    return new Paragraph({ children: inlineRuns(children, state) })
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    switch (t.type) {
      case 'heading_open': {
        const inline = tokens[i + 1]
        blocks.push(new Paragraph({ children: inlineRuns(inline.children || [], state), heading: HeadingLevel['HEADING_' + Math.min(t.tag[1], 6)] }))
        i += 2 // heading_close
        break
      }
      case 'paragraph_open': {
        const inline = tokens[i + 1]
        blocks.push(new Paragraph({ children: inlineRuns(inline.children || [], state), spacing: { after: 120 } }))
        i += 2
        break
      }
      case 'bullet_list_open': listStack.push('bullet'); break
      case 'ordered_list_open': listStack.push('ordered'); orderedCounter = 1; break
      case 'bullet_list_close':
      case 'ordered_list_close': listStack.pop(); orderedCounter = 1; break
      case 'list_item_open': {
        const inside = []
        while (i + 1 < tokens.length && tokens[i + 1].type !== 'list_item_close') { inside.push(tokens[i + 1]); i++ }
        i++ // list_item_close
        // first paragraph of the item provides the label line; extra paragraphs/children go inside
        const label = inside[0] && inside[0].type === 'paragraph_open' ? inside[1] : (inside[0] || {})
        const children = inlineRuns((label.children || []), {})
        const level = listStack.length - 1
        const prefix = listStack[listStack.length - 1] === 'ordered'
          ? new TextRun({ text: `${orderedCounter++}. `, size: 22, bold: false })
          : new TextRun({ text: '• ', size: 22 })
        blocks.push(new Paragraph({ children: [prefix, ...children], indent: { left: 360 * (level + 1) }, spacing: { after: 60 } }))
        // render any remaining paragraphs of this item at the same level
        const rest = inside.slice(2).filter((x) => x.type === 'paragraph_open' || x.type === 'paragraph_close')
        for (let j = 0; j < rest.length; j++) {
          if (rest[j].type === 'paragraph_open' && rest[j + 1]) {
            blocks.push(new Paragraph({ children: inlineRuns(rest[j + 1].children || [], {}), indent: { left: 360 * (level + 1) }, spacing: { after: 60 } }))
            j += 2
          }
        }
        break
      }
      case 'table_open': {
        const rows = []
        while (i < tokens.length && tokens[i].type !== 'table_close') {
          if (tokens[i].type !== 'tr_open') { i++; continue }
          const cells = []
          i++ // tr_open
          while (i < tokens.length && tokens[i].type !== 'tr_close') {
            if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
              const inline = tokens[i + 1]
              cells.push(new TableCell({ children: [new Paragraph({ children: inlineRuns((inline && inline.children) || [], {}) })] }))
              i += 2 // inline + close
            } else i++
          }
          i++ // tr_close
          rows.push(new TableRow({ children: cells }))
        }
        i++ // table_close
        blocks.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }))
        blocks.push(new Paragraph({ text: '' }))
        break
      }
      case 'fence': {
        blocks.push(new Paragraph({
          children: [new TextRun({ text: t.content, font: 'Courier New', size: 18 })],
          indent: { left: 480 }, preserve: true, spacing: { before: 120, after: 120 },
        }))
        break
      }
      case 'code_block': {
        blocks.push(new Paragraph({ children: [new TextRun({ text: t.content, font: 'Courier New', size: 18 })], indent: { left: 480 }, spacing: { after: 120 } }))
        break
      }
      case 'blockquote_open': {
        const inline = tokens[i + 1]
        blocks.push(new Paragraph({ children: inlineRuns(inline.children || [], {}), indent: { left: 720 }, italics: true, spacing: { after: 120 } }))
        i += 2
        break
      }
      case 'hr': blocks.push(new Paragraph({ text: '', spacing: { after: 120 } })); break
      case 'footnote_block_open': break
      case 'footnote_ref':
      case 'footnote_open':
      case 'footnote_close':
      case 'footnote_block_close':
        // handled inline; definitions appended separately
        break
      default:
        break
    }
  }
  collectFootnotes(tokens, state)
  if (Object.keys(state.footnotes).length) {
    blocks.push(new Paragraph({ children: [new TextRun({ text: 'Notes', bold: true, size: 22 })], heading: undefined, spacing: { before: 240, after: 80 } }))
    for (const id of Object.keys(state.footnotes).sort((a, b) => a - b)) {
      blocks.push(new Paragraph({ children: [new TextRun({ text: `[${id}] ${state.footnotes[id]}`, size: 20 })], spacing: { after: 60 } }))
    }
  }
  return blocks
}

/** Convert a markdown string to a .docx Buffer. */
export async function mdToDocx(content) {
  const tokens = md.parse(String(content || ''), {})
  const blocks = tokensToDocx(tokens)
  const doc = new Document({ sections: [{ children: blocks }] })
  return Buffer.from(await Packer.toBuffer(doc))
}

/** Extract plain text from an inline token array (bold/italic -> plain). */
function inlineText(tokens) {
  let out = ''
  for (const tok of tokens || []) {
    if (tok.type === 'text' || tok.type === 'code_inline' || tok.type === 'html_inline') out += tok.content
    else if (tok.type === 'footnote_ref') out += '[' + tok.meta.id + ']'
    else if (tok.children) out += inlineText(tok.children)
  }
  return out
}

/** Insert zero-width spaces after CJK glyphs so pdfkit can wrap long Chinese runs. */
function wrapCjk(s) {
  return String(s).replace(/([\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF])/g, '$1\u200B')
}

/** Walk block tokens and draw onto a pdfkit document. */
function drawTokens(doc, tokens, width) {
  let i = 0
  const flushList = (stop) => {
    const items = []
    for (let j = i + 1; j < tokens.length && tokens[j].type !== stop; j++) {
      const li = tokens[j]
      if (li.type === 'list_item_open' && tokens[j + 1] && tokens[j + 1].type === 'paragraph_open' && tokens[j + 2]) {
        items.push(wrapCjk(inlineText(tokens[j + 2].children)))
        j += 2
      }
    }
    return { items, next: (tokens.length) }
  }
  for (; i < tokens.length; i++) {
    const t = tokens[i]
    switch (t.type) {
      case 'heading_open': {
        const level = Number(t.tag[1]) || 1
        doc.moveDown(0.3)
        doc.fillColor('#111111').fontSize(18 - (level - 1) * 2.6).text(wrapCjk(inlineText(tokens[i + 1].children)), { width })
        i += 2
        break
      }
      case 'paragraph_open': {
        doc.fillColor('#222222').fontSize(11).text(wrapCjk(inlineText(tokens[i + 1].children)), { width, align: 'left', lineGap: 4 })
        doc.moveDown(0.15)
        i += 2
        break
      }
      case 'bullet_list_open':
      case 'ordered_list_open': {
        const stop = t.type === 'bullet_list_open' ? 'bullet_list_close' : 'ordered_list_close'
        const { items } = flushList(stop)
        if (items.length) doc.list(items, { width, indent: 18, lineGap: 3, bulletRadius: 1.5, numbered: t.type === 'ordered_list_open', markerColor: '#555555' })
        while (i < tokens.length && tokens[i].type !== stop) i++
        break
      }
      case 'table_open': {
        const rows = []
        while (i < tokens.length && tokens[i].type !== 'table_close') {
          if (tokens[i].type === 'tr_open') {
            const row = []
            i++
            while (i < tokens.length && tokens[i].type !== 'tr_close') {
              if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
                const inline = tokens[i + 1]
                row.push(wrapCjk(inlineText((inline && inline.children) || [])))
                i += 2
              } else i++
            }
            rows.push(row)
          }
          i++
        }
        const nCols = Math.max(0, ...rows.map((r) => r.length))
        const colWidth = width / Math.max(1, nCols)
        doc.moveDown(0.2)
        for (let r = 0; r < rows.length; r++) {
          const line = rows[r].slice(0, nCols).map((c) => (c || '').padEnd(Math.ceil(colWidth / 5.2))).join(' │ ')
          const prevFont = doc.fontSize(9)
          doc.fillColor(r === 0 ? '#111111' : '#333333').text(line, { width, lineGap: 2 })
        }
        doc.moveDown(0.2)
        break
      }
      case 'fence':
      case 'code_block': {
        const code = String(t.content || '').replace(/\s+$/, '')
        doc.moveDown(0.2)
        const y0 = doc.y
        const lines = code.split('\n')
        doc.save()
        doc.rect(52, y0, width + 4, lines.length * 11 + 10).fill('#f2f3f5')
        doc.fillColor('#2b2b2b').fontSize(9).text(code, 56, y0 + 6, { width: width - 8, lineGap: 2 })
        doc.restore()
        doc.moveDown(0.15)
        break
      }
      case 'blockquote_open': {
        doc.fillColor('#555555').fontSize(11).text(wrapCjk(inlineText(tokens[i + 1].children)), { width: width - 20, align: 'left' })
        i += 2
        break
      }
      case 'hr': doc.moveDown(0.2); doc.moveTo(52, doc.y).lineTo(52 + width, doc.y).stroke('#cccccc'); break
      default: break
    }
  }
}

/** Convert a markdown string to a .pdf Buffer via pdfkit + the bundled CJK font. */
export async function mdToPdf(content) {
  const tokens = md.parse(String(content || ''), {})
  const doc = new PDFDocument({ size: 'A4', margin: 52 })
  doc.font(FONT_FILE)
  const chunks = []
  doc.on('data', (c) => chunks.push(c))
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
  const width = 595.28 - 52 * 2 // A4 width minus margins
  drawTokens(doc, tokens, width)
  doc.end()
  return done
}
