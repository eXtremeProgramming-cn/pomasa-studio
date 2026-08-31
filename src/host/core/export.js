// Pure-JS markdown → docx/pdf export (no pandoc, no system binaries, no browser).
//
//   docx: markdown-it tokens → `docx` library   (CJK-safe, everything is OOXML)
//   pdf:  markdown-it tokens → `jsPDF` + `jspdf-autotable`, with HarmonyOS Sans
//         SC (Huawei's open CJK font) embedded and subset by jsPDF.
//
// The md is STR-08 pandoc-ready. Footnotes render as raised [n] references plus
// a trailing Notes section.
import fs from 'node:fs'
import path from 'node:path'
import MarkdownIt from 'markdown-it'
import mditFootnote from 'markdown-it-footnote'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx'

const FONT_FILE = path.resolve(new URL('../../../assets/fonts/HarmonyOS_Sans_SC_Regular.ttf', import.meta.url).pathname)

const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false }).use(mditFootnote)

/* ---------------- DOCX (tokens -> docx blocks) ---------------- */

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

/** Collect footnote definitions { id -> plain text } used by both builders. */
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

/* ---------------- PDF (tokens -> jsPDF) ---------------- */

/** Plain text from an inline token array (formatting stripped). */
function inlineText(tokens) {
  let out = ''
  for (const tok of tokens || []) {
    if (tok.type === 'text' || tok.type === 'code_inline' || tok.type === 'html_inline') out += tok.content
    else if (tok.type === 'footnote_ref') out += '[' + tok.meta.id + ']'
    else if (tok.children) out += inlineText(tok.children)
  }
  return out
}

/** Zero-width breaks after CJK glyphs so jsPDF wraps long Chinese runs. */
function zwsp(s) {
  return String(s).replace(/([⺀-鿿豈-﫿＀-￯])/g, '$1​')
}

const PDF_MARGIN = 52
const PDF_W = 595.28
const PDF_H = 841.89
const CJK_RE = /[⺀-鿿豈-﫿＀-￯]/

/** Render a text block with wrapping and page-break handling; advances doc.y. */
function pdfText(doc, text, size, color, indent, gap) {
  doc.setFont('HarmonyOS', 'normal')
  doc.setFontSize(size)
  doc.setTextColor(color[0], color[1], color[2])
  const width = PDF_W - PDF_MARGIN * 2 - (indent || 0)
  const lines = CJK_RE.test(text) ? doc.splitTextToSize(zwsp(text), width) : doc.splitTextToSize(text, width)
  const lh = size * 1.4
  doc.text(lines, PDF_MARGIN + (indent || 0), doc.y, { maxWidth: width })
  doc.y += lines.length * lh + (gap ?? 4)
  if (doc.y > PDF_H - PDF_MARGIN) { doc.addPage(); doc.y = PDF_MARGIN }
}

/** Split inline paragraph texts for a list item (first + continuation lines). */
function itemParagraphs(tokens, i) {
  const parts = []
  while (i + 1 < tokens.length && tokens[i + 1].type !== 'list_item_close') {
    if (tokens[i + 1].type === 'paragraph_open') {
      const inline = tokens[i + 2]
      parts.push(inlineText((inline && inline.children) || []))
      i += 2
    }
    i++
  }
  return { parts, i }
}

/** Convert a markdown string to a .pdf Buffer via jsPDF + autotable + the bundled CJK font. */
export async function mdToPdf(content) {
  const tokens = md.parse(String(content || ''), {})
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.y = PDF_MARGIN
  doc.addFileToVFS('HarmonyOS.ttf', Buffer.from(fs.readFileSync(FONT_FILE)).toString('base64'))
  doc.addFont('HarmonyOS.ttf', 'HarmonyOS', 'normal')
  doc.setFont('HarmonyOS')

  const state = { footnotes: {}, footnoteRefs: new Set() }
  collectFootnotes(tokens, state)

  const lists = [] // [{ kind: 'bullet'|'ordered', items: [..] }], index = depth
  const flushLists = () => {
    for (const grp of lists) {
      for (let idx = 0; idx < grp.items.length; idx++) {
        const prefix = grp.kind === 'ordered' ? `${idx + 1}. ` : '• '
        pdfText(doc, prefix + grp.items[idx], 11, [34, 34, 34], 16, 2)
      }
    }
    lists.length = 0
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    switch (t.type) {
      case 'heading_open': {
        const lvl = Number(t.tag[1]) || 1
        pdfText(doc, inlineText(tokens[i + 1].children), Math.max(11, 17 - (lvl - 1) * 2), [17, 17, 17], 0, 6)
        i += 2
        break
      }
      case 'paragraph_open': {
        const txt = inlineText(tokens[i + 1].children)
        if (txt.trim()) pdfText(doc, txt, 11, [34, 34, 34], 0, 5)
        i += 2
        break
      }
      case 'bullet_list_open': lists.push({ kind: 'bullet', items: [] }); break
      case 'ordered_list_open': lists.push({ kind: 'ordered', items: [] }); break
      case 'list_item_open': {
        const { parts, i: next } = itemParagraphs(tokens, i)
        i = next
        if (lists.length) lists[lists.length - 1].items.push(parts.join(' '))
        break
      }
      case 'bullet_list_close':
      case 'ordered_list_close':
        if (i + 1 < tokens.length && tokens[i + 1].type !== 'list_item_open') flushLists()
        break
      case 'fence':
      case 'code_block': {
        flushLists()
        const code = String(t.content || '').replace(/\s+$/, '')
        const lines = code.split('\n')
        doc.setFont('HarmonyOS', 'normal').setFontSize(8).setTextColor(70, 70, 70)
        const y0 = doc.y
        doc.setFillColor(242, 243, 245)
        doc.rect(PDF_MARGIN, y0, PDF_W - PDF_MARGIN * 2, lines.length * 9 + 8, 'F')
        doc.text(lines, PDF_MARGIN + 6, y0 + 12)
        doc.y = y0 + lines.length * 9 + 8
        if (doc.y > PDF_H - PDF_MARGIN) { doc.addPage(); doc.y = PDF_MARGIN }
        break
      }
      case 'table_open': {
        flushLists()
        const rows = []
        let row = []
        for (let j = i + 1; j < tokens.length && tokens[j].type !== 'table_close'; j++) {
          const tt = tokens[j]
          if (tt.type === 'tr_open') { row = []; continue }
          if (tt.type === 'th_open' || tt.type === 'td_open') {
            const inline = tokens[j + 1]
            row.push(inlineText((inline && inline.children) || []))
            j++
          }
          if (tt.type === 'tr_close') { rows.push(row); row = [] }
        }
        for (let j = i + 1; j < tokens.length; j++) { if (tokens[j].type === 'table_close') { i = j; break } }
        autoTable(doc, {
          startY: doc.y,
          head: rows.length ? [rows[0]] : [],
          body: rows.slice(1),
          styles: { font: 'HarmonyOS', fontSize: 9, cellPadding: 5, lineColor: [210, 214, 220], lineWidth: 0.4 },
          headStyles: { fillColor: [36, 95, 165], textColor: 255, fontStyle: 'normal' },
          alternateRowStyles: { fillColor: [247, 248, 250] },
          margin: { left: PDF_MARGIN, right: PDF_MARGIN },
        })
        doc.y = doc.lastAutoTable.finalY + 8
        break
      }
      default: break
    }
  }
  flushLists()

  if (Object.keys(state.footnotes).length) {
    pdfText(doc, 'Notes', 12, [17, 17, 17], 0, 4)
    for (const id of Object.keys(state.footnotes).sort((a, b) => a - b)) {
      pdfText(doc, `[${id}] ${state.footnotes[id]}`, 9, [90, 90, 90], 0, 2)
    }
  }
  return Buffer.from(doc.output('arraybuffer'))
}