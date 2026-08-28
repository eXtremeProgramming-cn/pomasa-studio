# POMASA 工作区约定

本工作区托管所有 POMASA 研究 MAS。每个 MAS 是一个自包含目录（agents/、references/、workspace/、pomasa.json）。

## 目录边界
- 只允许在自己的 MAS 目录内写文件。生成阶段写到 MAS 根，运行阶段写到 workspace 下的单元根。
- 运行沙箱的写入范围就是单元根，运行期的所有写入（含运行笔记）都要放在单元根内；单元根之外的路径（如 MAS 根的 wip/）不是运行沙箱范围，不要写。
- ~/.pomasa/skills/<version>/ 是只读的生成器 skill 快照。

## 上网工具
- crawl4ai（已随 POMASA 安装，工具名为 mcp__crawl4ai__*）：网页全文抓取的首选，抓不到再降级。
- 其它已配置的抓取工具（serper 等收费服务）：如主动配置了再使用，未配置则忽略。
- 未配置任何抓取工具时，用 curl 直连抓全文。
- 兜底才用 LLM 自带 web_search / web_fetch。
搜索摘要不可信，必须抓原网页全文后再引用（BHV-05）。

## 输出
- 一切产物为 Markdown，按要求维护各阶段 index.json（OBV-01）。
- 运行期按 OBV-03 维护 run.json。