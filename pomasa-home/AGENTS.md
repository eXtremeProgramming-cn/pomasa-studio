# POMASA 工作区约定

本工作区托管所有 POMASA 研究 MAS。每个 MAS 是一个自包含目录（agents/、references/、workspace/、pomasa.json）。

## 目录边界
- 只写单元根内的文件（single 的单元根就是 MAS 的 workspace 目录，multi 是 workspace 下的单元目录）；运行期所有写入含运行笔记都在单元根内，单元根之外不写。
- ~/.pomasa/skills/<version>/ 是只读的生成器 skill 快照。

## 上网工具
如需 MCP 网页工具，建议（按推荐顺序）在 **你自己的工作区 `.mcp.json`** 里配置，POMASA 不随插件安装任何 MCP：

- **crawl4ai**（网页全文抓取首选）：https://github.com/gigix/crawl4ai-mcp-server
- **serper**（Google 搜索）：https://serper.dev
- **oxylabs**（网页抓取系列）：https://oxylabs.io

未配置任何抓取工具时，用 curl 直连抓全文；兜底才用 LLM 自带 web_search / web_fetch。
搜索摘要不可信，必须抓原网页全文后再引用（BHV-05）。

## 输出
- 一切产物为 Markdown，按要求维护各阶段 index.json（OBV-01）。
- 运行期按 OBV-03 维护 run.json。