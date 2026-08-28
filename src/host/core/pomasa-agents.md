# POMASA 工作区约定

本工作区托管所有 POMASA 研究 MAS。每个 MAS 是一个自包含目录（agents/、references/、workspace/、pomasa.json）。

## 目录边界
- 只允许在自己的 MAS 目录内写文件。生成阶段写到 MAS 根，运行阶段写到 workspace 下的单元根。
- ~/.pomasa/skills/<version>/ 是只读的生成器 skill 快照。

## 上网工具优先级（有则用，无则依次降级）
1. 项目配置的抓取工具（crawl4ai、serper 等 MCP）
2. 直连 curl 抓全文
3. 兜底才用 LLM 自带 web_search / web_fetch
搜索摘要不可信，必须抓原网页全文后再引用（BHV-05）。

## 输出
- 一切产物为 Markdown，按要求维护各阶段 index.json（OBV-01）。
- 运行期按 OBV-03 维护 run.json。