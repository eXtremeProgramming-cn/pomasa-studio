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
- [x] Split into units, each executed separately

**Unit Dimensions**: ${f.runDimensions || '由 AI 建议'}

**Initial Unit List** (if known ahead):
${Array.isArray(f.runUnits) && f.runUnits.length ? f.runUnits.map((u) => `- ${u}`).join('\n') : '- （由 AI 建议）'}
`
      : `**How is work divided into runs?**

- [x] Run once as a whole system
- [ ] Split into units, each executed separately
`
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