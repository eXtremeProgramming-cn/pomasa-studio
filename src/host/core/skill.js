import fs from 'node:fs'
import path from 'node:path'
import { pomasaHome, packagedSkillDir } from './paths.js'

/**
 * The POMASA skill snapshot is materialized under ~/.pomasa/skills/pomasa/<version>.
 * The version is read from the packaged SKILL.md frontmatter (metadata.version),
 * so it tracks the skill itself rather than a metadata schema namespace.
 */
const SKILL_DIRNAME = 'pomasa'
const SKILL_MD = 'SKILL.md'

function skillVersion() {
  try {
    const text = fs.readFileSync(path.join(packagedSkillDir(), SKILL_MD), 'utf8')
    // read `version` from the YAML frontmatter (it is nested under metadata:)
    const fm = text.match(/^---\n([\s\S]*?)\n---/)
    const m = (fm ? fm[1] : text).match(/^\s*version:\s*["']?([0-9][^\s"']*)/m)
    if (m) return m[1]
  } catch { /* fall through */ }
  return '0'
}

/** Skill snapshot location inside ~/.pomasa, pinned by the skill version. */
export function skillDir(home) {
  return path.join(home, 'skills', SKILL_DIRNAME, skillVersion())
}

/**
 * Materialize the packaged POMASA skill snapshot into
 * ~/.pomasa/skills/pomasa/<version>. Idempotent: if the pinned version already
 * exists, it is left untouched. The legacy "obv-1" layout (named after the OBV
 * schema version) is migrated away when present.
 */
export function ensureSkill(config) {
  const home = pomasaHome(config)
  const target = skillDir(home)
  if (fs.existsSync(target)) {
    migrateLegacySkill(home, target)
    return target
  }
  const src = packagedSkillDir()
  fs.mkdirSync(target, { recursive: true })
  for (const name of fs.readdirSync(src)) {
    fs.cpSync(path.join(src, name), path.join(target, name), { recursive: true })
  }
  migrateLegacySkill(home, target)
  return target
}

function migrateLegacySkill(home, target) {
  const legacy = path.join(home, 'skills', 'obv-1')
  if (legacy === target || !fs.existsSync(legacy)) return
  try {
    fs.rmSync(legacy, { recursive: true, force: true })
  } catch { /* non-fatal */ }
}

/** The prompt that drives a generation session. */
export function generationPrompt(skill, masId, masRoot) {
  return `你是 POMASA 生成器。请严格遵守以下指示完成 MAS 生成：

- 生成器 skill：${path.join(skill, 'SKILL.md')}
- 用户输入：${path.join(masRoot, 'user_input.md')}

流程：先读 SKILL.md，按其要求先读 pattern-catalog/README.md，再读全部 Required 模式文档（COR-01/02、STR-01/06、BHV-02、QUA-03、OBV-01/02/03），然后读 user_input.md，把完整的 MAS 生成到当前工作目录。

注意：SKILL.md 中的相对路径（如 ./pattern-catalog/）以 ${skill} 目录为基准解析；所有生成输出写入当前工作目录 ${masRoot}。
不要提问，按流程执行。`
}

/** The prompt that starts a run session for one unit. */
export function runPrompt(masRoot, unitRoot, unitKey) {
  return `你是本 MAS 的编排者（Orchestrator）。本次运行单元：${unitKey ?? 'single'}。

请打开 ${path.join(masRoot, 'agents', '00.orchestrator.md')}，严格按照该蓝图执行本次运行（按 OBV-03 协议创建并维护 ${path.join(unitRoot, 'run.json')}，按需调用各阶段子代理，各阶段按 OBV-01 维护其 index.json）。

沙箱写入范围就是当前工作目录（单元根）。运行期所有文件写入、包括运行笔记，都必须放在单元根内；不要尝试写单元根之外的路径（如 MAS 根的 wip/）。

当前工作目录（单元根）：${unitRoot}
不要提问，按流程执行。`
}