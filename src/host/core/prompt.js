import fs from 'node:fs'
import path from 'node:path'
import { masDir, pomasaHome } from './paths.js'

/**
 * Build the user_input markdown from the Studio form fields.
 * Output format is forced to Markdown only (DESIGN decision 2 + appendix A):
 * the Studio exports on demand, so no DOCX/PDF pipeline is generated.
 */
export function buildUserInput(f) {
  const run =
    f.runMode === 'multi'
      ? `**How is work divided into runs?**

- [ ] Run once as a whole system
- [x] Run the MAS separately for each research object (e.g. per country or per date), each run isolated from the others

**Research Object Dimension** (e.g. country, date): ${f.runDimensions || '由 AI 建议'}

**Initial Research Objects** (optional, one per line):
${Array.isArray(f.runUnits) && f.runUnits.length ? f.runUnits.map((u) => `- ${u}`).join('\n') : '- （由 AI 建议）'}
`
      : `**How is work divided into runs?**

- [x] Run once as a whole system
- [ ] Run the MAS separately for each research object (e.g. per country or per date), each run isolated from the others
`
  // Implicit Studio requirement (POMASA STR-08, Pandoc-Ready Markdown): every
  // generated report must cite its references as pandoc footnotes and follow
  // the pandoc-ready formatting rules, so the final report converts cleanly
  // instead of accumulating a messy ad-hoc reference section.
  const pandocSpec = [
    '**Report Formatting**（隐含规格，必选）：最终报告必须符合 Pandoc-Ready Markdown 格式（POMASA STR-08）。',
    '- 引用文献一律做成 pandoc 脚注：正文引用处以 `[^n]` 标注（如 `[^src01]`），脚注定义 `[^n]: ...` 统一放在文档末尾的脚注定义区；不要把引注写成内联链接或堆在文末大段列表里。',
    '- 全文档只有一个一级标题（#）；章节用二级及以下标题，层级连续不跳级。',
    '- 标题、列表、代码块、引用、表格等块级元素前后各留一个空行；列表统一用 `-`，嵌套用 2 空格缩进。',
    '- 中文报告使用全角标点（“”、、，。），不用 ASCII 直引号。',
  ].join('\n')
  return `# User Input

## Language Settings

**Agent Blueprint Language**: ${f.language || 'Chinese'}

**Report Output Language**: ${f.reportLanguage || f.language || 'Chinese'}

---

## Research Project Basic Information

**Project Identifier**: ${f.projectId}

**Research Topic and Core Questions**: ${f.topic}

**Initial Ideas and Insights**: ${f.ideas || '由 AI 建议'}

---

## Data Collection

**Data Sources**: ${f.dataSources || '公开网络信息'}

**Existing Reference Materials**:
${Array.isArray(f.refs) && f.refs.length ? f.refs.map((r) => `- ${r}`).join('\n') : '- （由 AI 建议）'}

---

## Analysis Methods

**Analysis Methods**: ${f.analysis || '由 AI 建议'}

---

## Output Format

**Report Format**: ${f.reportFormat || '研究报告'}

**Report Structure**: ${f.reportStructure || '由 AI 建议'}

${pandocSpec}

---

## Run Unit Planning

${run}

---

## Pattern Selection

**Quality Assurance Level**: ${f.qaLevel || 'Standard'}

**Other Patterns to Enable or Disable**: ${f.patterns || '无'}

---

## Other Requirements

${f.other || '无。请注意：本系统由 POMASA Studio 托管，输出格式统一为 Markdown，不需要 DOCX/PDF 导出管线。'}
`
}

/** Write user_input.md into the MAS root (the generation session reads it). */
export function writeUserInput(config, masId, fields) {
  const root = masDir(pomasaHome(config), masId)
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'user_input.md'), buildUserInput(fields), 'utf8')
}