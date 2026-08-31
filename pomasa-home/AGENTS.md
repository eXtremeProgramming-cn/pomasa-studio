# POMASA 工作区约定

## POMASA 是什么

POMASA（模式导向的多智能体系统架构，Pattern-Oriented Multi-Agent System Architecture）是一套关于"如何建设 AI 辅助研究系统"的知识体系与生成机制。它把构建研究多智能体系统的经验沉淀为一套模式目录（pattern catalog），AI 读完这些模式，就能为单个研究课题生成一个自包含、可运行、可观察的研究 MAS。研究者也可以把自己对课题的问题意识与分析洞察注入生成出的系统，再迭代完善。完整模式目录与论文见 https://github.com/eXtremeProgramming-cn/pomasa，需要时自行查阅。

## 声明式 MAS 架构

POMASA 的核心架构主张：一套 MAS 不是程序，而是一组声明。agent 用自然语言蓝图定义（COR-01），不写编译代码；运行时由智能运行时解释执行（COR-02）。也因此，对智能体运行时而言，POMASA 模式语言本身是可执行的：AI 可以直接读模式、直接生成可运行的系统，省掉人把模式翻译成代码的环节。

这个架构带来三个关键属性：

- 系统的全部就是一组可读文档（agent 蓝图、描述符 pomasa.json、参考数据）。任何人和任何 AI 都能直接读、直接改、重新生成整个系统。
- 建设系统的门槛从"会编程"降到"会用研究语言描述系统"。POMASA 的构建者本就是领域研究者而非软件工程师，这套架构让他们不必学 API 和数据结构。
- 运行时与界面只按声明执行和渲染，不写死任何结构；系统长什么样、跑到哪、产出什么，全程由声明文件说话。

声明文件的具体形态（pomasa.json 声明结构、run.json 记录运行、index.json 枚举产物）见模式快照 `~/.pomasa/skills/<version>/pattern-catalog/` 的 OBV-01/02/03。

本工作区托管所有 POMASA 研究 MAS。每个 MAS 是一个自包含目录（agents/、references/、workspace/、pomasa.json）。

## 目录边界
- 只写单元根内的文件（single 的单元根就是 MAS 的 workspace 目录，multi 是 workspace 下的单元目录）；运行期所有写入含运行笔记都在单元根内，单元根之外不写。
- ~/.pomasa/skills/<version>/ 是只读的生成器 skill 快照。

## 上网工具
大模型缺省的搜索和网页获取工具通常比较难用且贵。建议按运行环境安装并启用下列 MCP 工具上网：

- **crawl4ai**（网页全文抓取首选，工具形如 `mcp__crawl4ai__read_url`）：https://github.com/gigix/crawl4ai-mcp-server
- **serper**（Google 搜索，工具形如 `mcp__serper-search__google_search`）：https://serper.dev
- **oxylabs**（网页抓取系列，工具形如 `mcp__oxylabs__universal_scraper`、`mcp__oxylabs__ai_search`）：https://oxylabs.io

MCP 工具以 `mcp__<服务名>__<工具名>` 命名，服务名随安装配置而定；以会话上下文里实际出现的 mcp__* 工具为准。工作区预置了 MCP 配置 `~/.pomasa/.dsh/mcp.servers.yml`，装好 POMASA Studio 后 dsh 启动会自动按它加载 MCP 工具，无需额外安装。其中 crawl4ai 免密钥即可用，serper 与 oxylabs 填入密钥后启用。

## 上网搜索原则（Grounded Search）

搜索摘要不可信，必须抓原网页全文后再引用（BHV-05）。具体做到三点：

- 先搜索定位可能相关的来源，不轻信摘要与快照。
- 关键信息一律抓原网页或原始文件全文，以原文上下文核对结论、数字与出处。
- 引用必须能溯源到原文；找不到原文支撑的说法不写入产出。

## 输出
- 一切产物为 Markdown，按要求维护各阶段 index.json（OBV-01）。
- 运行期按 OBV-03 维护 run.json。