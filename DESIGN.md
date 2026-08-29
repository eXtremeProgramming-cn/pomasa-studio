# pomasa-studio 数据流设计（草案）

状态：v0.3（2026-08-28）。数据流设计定稿，六项设计决策全部确认，记录在第五节。

## 0. 目标与设计方法

目标：让任意 POMASA 生成的 MAS 可以被任意界面一致地展示和管理。当前以 DSH 插件形态出现（会话区 tab），远期抽离成独立"研究工作台"。

两条主原则：

1. 文件事实驱动。UI 的状态（阶段、产物、运行判定）都从 `~/.pomasa` 目录里的文件推导。运行时会话文本只在用户主动展开日志时才呈现，不参与状态推导。
2. 单边依赖。MAS（生成器、运行时、各 agent）负责产出描述符与运行记录；插件和 UI 只读与呈现；指令只能经会话通道注入。MAS 本身不依赖任何插件。

设计链条按你的要求推进：先定界面行为，从界面行为倒推数据接口，从数据接口倒推元数据规定与生成时机，再倒推 POMASA 需要增加的模式。

### 运行单元（v0.2 核心概念）

"一次运行"不是一个固定形状，它因 MAS 而异：

- 有的 MAS 刻在实体轴上（数字主权指数一次运行一个国家，属 BHV-03 并行执行场景）
- 有的刻在时间轴上（news-on-china 一次运行一个日期，属 BHV-07 累积场景）
- 有的根本没有运行轴，就整体跑一次（数据中心治理）

所以运行如何划分是 MAS 的设计决定，必须由元数据描述，不能由数据流写死。本设计把"运行"泛化为**运行单元**：每个单元是一份自包含的工作单位（单元根目录内含 run.json、阶段产物、output），单元键是物理含义名（国家、日期、混合键），而不是不透明的 run id。

## 1. 界面行为

### 1.1 页面与流转

工作台是分栏形态：左栏 MAS 导航（列表 + 新建/删除），右栏详情工作台（信息条、运行控制、阶段条、产物卡、查看器）；新建表单在右栏内。无整页路由。

渲染面（见 UI.md「最终界面形态」）：同一套工作台挂在 `conversation.view` tab（会话内，左侧会话树始终在屏）与 `shell.overlay` 冷启动面板（footer 按钮，有界不遮挡，空白会话也可达）两个槽位。流转：导航选 MAS → 右栏详情；新建 → 右栏表单，提交后回导航并进入该 MAS 详情。

### 1.2 页面 A：MAS 列表

行为：
- 从 `~/.pomasa/registry.json` 枚举 MAS，卡片展示：名称、一句话描述、运行统计（单元数、最后运行时间）、状态徽记（生成中、运行中、空闲、异常）。
- 动作：新建（进表单）、进入（进详情）、删除（二次确认，连带删除该 MAS 家目录）。
- 空态：引导文案加"新建第一个 MAS"按钮。
- 生成中的卡片：骨架屏加当前环节短语（如"正在设计 agent 结构"），附可折叠的会话日志面板（默认收起），展开即见生成会话的完整记录，含 AI 思考过程。

### 1.3 页面 B：新建 MAS 表单

- 字段 = user_input 模板，去掉输出格式部分：语言设置（蓝图语言、报告语言）、项目标识、研究主题与核心问题、初始想法、数据来源、参考资料（支持本地上传或 URL）、分析方法、报告格式与结构、质量等级、其它模式开关、其它要求。输出格式不选，统一为 Markdown，导出由查看器处理。
- 每字段可留空或写"由 AI 建议"，生成器兜底。
- 提交后立即回列表，该 MAS 以生成中状态呈现；可取消生成，失败可重试。

推导说明：表单字段就是 user_input，生成动作只有一个，把填好的 user_input 交给生成器会话。所以创建侧数据接口只有一个 `mas.create(input)`，其余都是文件事实。

### 1.4 页面 C：MAS 详情（核心页面）

顶部信息条：名称、描述、生成器与 schema 版本、创建时间、模式摘要、运行单元说明（单元轴是什么）。

运行控制区按 `work.mode` 分支：

- single：只有"运行"按钮，点一次跑整条流水线。
- multi：运行选择器 = 单元列表，每个单元一项，显示键名与状态（已枚举未运行、运行中、已完成、失败）；一次运行选择一个单元（人力逐单元启动，不批量并行）。若单元由运行期枚举，列表还包括"已枚举未运行"的提示，如已枚举 120 国，已运行 34。
- 时间轴 multi：运行选择器显示各日期单元，按钮为"跑新一期"（默认今天）。

主体三区：

1. 阶段条（横向）：每阶段一格，显示状态灯（等待、运行中、完成、失败、跳过），格角显示该阶段产物数量。点击某格选中该阶段。
2. 阶段产物区：该单元该阶段的产物卡片列表。卡片含：标题、副标题、概述、文件名、大小、产出时间、产出 agent。空态显示"该阶段尚未产出"。
3. 功能面板：选中产物后展示内容查看器（md 渲染、json 结构化、其它按文本），查看器顶部提供"导出 docx / pdf"动作，把当前 md 内容转换输出；运行中显示活动流（当前阶段、当前 agent、最近工具调用）；底部干预输入框向当前单元运行会话注入自由文本。功能面板另含可折叠的会话日志区（默认收起），展开显示完整会话记录，含 AI 思考过程，生成会话与运行会话同一处理。

运行信息栏：单元键、该单元的创建、启动、结束时间，状态，触发方式（按钮、外部），运行时会话标识。

状态判定规则（关键）：

- 阶段状态以单元根的 run.json 为权威。
- 兜底：run.json 缺失该阶段记录时，用该阶段 index.json 的存在性与文件时间推导。
- 产物数量读 index.json 条目数。
- 运行中判定：`run.json.status == running`，配合活动流是否活跃。
- 绝不读 orchestrator 的会话文本。

### 1.5 产物点击行为

内容查看器按类型分派：
1. `.md` 渲染（标题层级、表格、代码块、脚注）。
2. `.json` 结构化展示。
3. 其它类型按 UTF-8 文本。
非文本文件只显示文件名与大小，v1 不做预览。

## 2. 数据接口

接口的角色是薄翻译层：读请求映射到 `~/.pomasa` 的文件事实，写动作映射到运行时会话。接口自身不保存状态；registry.json 只是可推导的索引缓存。

### 2.1 接口清单

读：

| 接口 | 输入 | 输出 |
|---|---|---|
| `mas.list` | 无 | 注册表条目加快速状态 |
| `mas.get` | masId | pomasa.json 静态描述符（含 work 段） |
| `generation.status` | masId | generating、completed、failed + 当前环节短语 |
| `unit.list` | masId | 单元列表，每个单元读单元根 run.json 概要；未建目录而在 units_index 出现过的单元显示为"已枚举未运行" |
| `unit.state` | masId, unitKey | 单元根 run.json + 各阶段 index 概要 + 活动脉冲 |
| `artifact.read` | masId, unitKey, relPath | 文件内容（防路径穿越） |
| `event.stream` | masId, unitKey | 活动事件推送（WS、SSE、RPC），轮询兜底 |
| `generation.log` | masId | 生成会话完整记录（消息、工具调用、AI 思考过程），流式或翻页 |
| `run.log` | masId, unitKey | 运行会话完整记录，同上 |

写：

| 接口 | 输入 | 效果 |
|---|---|---|
| `mas.create` | input（user_input 字段） | 建占位目录、起生成会话、返回 masId |
| `run.start` | masId, opts | opts 含 units（数组或 "all"）或 auto（默认键，见 3.2）；single 模式忽略 opts |
| `run.intervene` | masId, unitKey, message | 向该单元运行会话注入自由文本 |
| `run.cancel` | masId, unitKey | 取消该单元运行会话 |

### 2.2 实现要点

- `artifact.read` 做路径白名单，解析后必须落在 masId、单元根目录内。
- `event.stream` 的实时源是运行时会话事件（DSH 下是 agent 事件流）；断线自动降级为轮询 run.json。
- `generation.log`、`run.log` 读运行时会话存储（DSH 的会话记录），不属于 `~/.pomasa` 的文件事实，属运行时绑定的追溯能力。无日志源（如未来非 DSH 运行时）时该面板自动隐藏，不影响其它功能。
- 研究工作台未来就是这个接口清单的独立实现，UI 端只依赖这些接口。

推导说明：此表逐行对应第一节的行为清单，没有为接口而接口的条目。multi 模式下"运行选择器"直接对应 unit.list 与 run.start(units)。

## 3. 元数据规定与生成时机

### 3.1 文件布局（运行单元泛化）

```
~/.pomasa/
├── registry.json                 # MAS 索引（插件维护的缓存，逻辑上可推导）
├── skills/pomasa/<版本>/          # POMASA skill 加 OBV 模式快照，钉版本
└── <mas-id>/                     # MAS 家目录，自包含
    ├── pomasa.json               # 静态描述符（stages、contracts、work）
    ├── agents/                   # 蓝图，每个蓝图内含 Artifact 契约声明
    ├── references/               # 参考资料
    ├── units.json                # 可选：运行期枚举出的单元清单
    └── workspace/
        ├── <unit-key>/           # multi 模式：单元根，键为国名、日期等
        │   ├── run.json          # 该单元运行记录（动态状态机）
        │   ├── events.jsonl      # 可选活动流（非 DSH 运行时兜底）
        │   └── NN.<stage>/       # 各阶段产物目录，内含 index.json
        └── (stage 目录直接铺开)   # single 模式：workspace 本身就是单元根
```

关键：
- run.json 的位置规则统一为"单元根"。single 模式的单元根就是 workspace/，multi 模式是 workspace/\<unit-key\>/。
- 单元目录自包含。删除一个单元就是删一个目录，备份就是拷一个目录。
- 不设 output 目录。最终报告就是末阶段的一个普通产物（single-file 契约，如 05.report/final_report.md）。docx / pdf 导出是查看器能力，按需转换，MAS 不产出交付格式文件（Harness 场景仍可用 STR-09 自建导出管线，Studio 不依赖它）。

### 3.2 静态描述符 pomasa.json

生成时一次写出，此后只随蓝图变更而重算。work 段描述运行单元规划。

```json
{
  "schema_version": "obv-1",
  "pomasa_version": "1.0",
  "id": "sos-digital-index",
  "name": "Digital Sovereignty Index Assessment",
  "description": "按国家评估数字主权指数",
  "created_at": 1758000000000,
  "generator": "pomasa-generator-obv-1",
  "patterns": [
    { "id": "COR-01", "name": "Prompt-Defined Agent", "necessity": "required" },
    { "id": "BHV-03", "name": "Parallel Instance Execution", "necessity": "recommended" }
  ],
  "work": {
    "mode": "multi",
    "dimensions": ["country"],
    "units": null,
    "units_index": "units.json",
    "unit_layout": "workspace/{country}"
  },
  "stages": [
    {
      "index": 1,
      "id": "country_enum",
      "title": "Country Enumerator",
      "agent_file": "agents/01.country_enum.md",
      "kind": "stage",
      "contracts": []
    },
    {
      "index": 2,
      "id": "deep_research",
      "title": "Deep Researcher",
      "agent_file": "agents/02.deep_researcher.md",
      "kind": "stage",
      "contracts": [
        {
          "id": "assessment",
          "title": "Country Assessment",
          "shape": "single-file",
          "format": "markdown",
          "path_glob": "02.deep_research/assessment.md",
          "index_path": "02.deep_research/index.json",
          "schema": ["id", "title", "summary", "file"]
        }
      ]
    }
  ]
}
```

work 段字段：

- `mode`：`single` 或 `multi`。
- `dimensions`：单元键的物理意义，如 `["country"]`、`["date"]`。多注重按维嵌套，`["country", "year"]` 对应 `workspace/{country}/{year}/`。
- `units`：预声明单元列表（静态已知时），或 `null` 表示运行期枚举。时间轴 multi（如 news-on-china）通常不预声明，run.start 默认键就是当天。
- `units_index`：运行期枚举结果写出的文件路径（相对 MAS 家目录），由 orchestrator 的枚举阶段（如 country_enum）写入。
- `unit_layout`：单元目录的 glob 模板，UI 靠它列出单元。

single 模式的 work 段是最简形：

```json
"work": { "mode": "single" }
```

要点：
- `index=0` 通常是 orchestrator，kind 为 orchestrator，无契约。
- 契约是产出形状的定义，与具体单元无关，路径一律相对单元根。
- 生成时机：生成器写完 agents/ 后，聚合蓝图里的 Artifact 声明写成 pomasa.json。蓝图声明是唯一权威源，pomasa.json 是它的聚合副本。

### 3.3 契约形状（沿用并正式化四个已验证形状）

| shape | 用途 | 实例来源 |
|---|---|---|
| vertical-list | 同类条目持续增长（如分析案例） | 阶段 index.json |
| horizontal-versions | 同一对象的多版本（如稿件草稿） | 阶段 index.json |
| multi-file | 通用回退（若干松散 md） | 阶段 index.json（可选） |
| single-file | 单个文档（常为交付物） | 阶段 index.json（单条） |

契约的 `path_glob`、`index_path` 相对单元根。UI 按 mode 解析基址：single 对 workspace/，multi 对 workspace/\<unit-key\>/。

### 3.4 阶段实例切片 index.json（动态）

产出该阶段的 agent 在写完产物时同步写或更新。这是"每个产物的元数据表述"的载体。

```json
[
  {
    "id": "case-001",
    "title": "Meta Llama",
    "subtitle": "开源模型基础与治理现状",
    "summary": "该案例的发现综述",
    "file": "case-001-meta.md",
    "size": 48232,
    "created_at": 1758000000000,
    "producer": "deep_researcher"
  }
]
```

兼容 `{ "version": 1, "entries": [...] }` 形式。file 相对 index.json 所在目录解析。

规则：id、title、file 必填；subtitle、summary、size、created_at、producer 建议。后五项缺失不阻塞展示，校验不强制。

### 3.5 运行记录 run.json（动态，单元级状态机）

由 orchestrator 在阶段边界增量更新：单元运行开始时写初始骨架，阶段进入、完成、失败时更新对应条目，单元运行结束封口。

```json
{
  "schema_version": "obv-1",
  "mas_id": "sos-digital-index",
  "unit": "brasil",
  "created_at": 1758000000000,
  "status": "running",
  "trigger": "ui",
  "runtime": "dsh",
  "runtime_session_id": "sess-123",
  "stages": [
    {
      "index": 2,
      "id": "deep_research",
      "status": "active",
      "started_at": 1758000001000,
      "finished_at": null
    }
  ]
}
```

要点：
- run.json 只存状态机，不复制 index 条目，避免两处都写的双源问题。产物枚举以各阶段 index.json 为准。
- 生成时机：运行期由 orchestrator 维护，不是生成期。
- 兜底：DSH 宿主下，插件观察会话事件，若 run.json 未及时出现，可降级由插件补写。此兜底不作主机制，其余运行时没有此兜底也正常。

### 3.6 数据流汇总

生成时（每个 MAS 一次）：

```
user_input
  -> 生成器会话（POMASA skill 加 OBV 模式）
  -> agents/（含契约声明） + references/ + pomasa.json（含 work 段）
  -> 插件校验契约完整性
  -> 写 registry.json
```

运行时（每个单元）：

```
run.start（single 无键；multi 指定单元或 all；时间轴 multi 默认当天）
  -> 运行会话（orchestrator 蓝图）
  -> 需要枚举时，枚举阶段写 units.json
  -> 阶段 agent 写产物并更新 index.json
  -> orchestrator 在阶段边界更新 run.json
  -> 插件 watch ~/.pomasa/<id>/ 刷新 UI
  -> 活动层订阅会话事件
```

展示时（每次刷新）：

```
详情页 = mas.get（静态）+ unit.state（动态）
work 段定位单元，契约定容器、index 定实例、文件定内容
```

### 3.7 一致性校验（插件健康检查）

- 蓝图 Artifact 声明的 id 集合与 pomasa.json 汇总的契约 id 集合一致，否则提示描述符过期（提醒重算）。
- 生成完成时校验：必选文件齐备，pomasa.json 可解析，stages 与 agents/ 文件序列对应，work 段与列出的单元目录一致。
- 运行中：run.json 阶段状态与 index.json 的修改时间不矛盾（阶段标 completed 但 index 为空允许，但提示）。
- units.json 枚举出的单元若未建目录、无 run.json，不算异常，属于"已规划未运行"状态。

推导说明：第二节的全部读接口，返回数据都来自这些文件（pomasa.json、run.json、index.json、units.json）加文件本体。元数据文件总共四个，外加每单元一份 run.json。生成时机都标在上文里，全部归到两处：生成器一次写出，运行时增量维护。

## 4. POMASA 新增模式提案

新增分类 OBV（Observability，可观测性），三条必选模式：

**OBV-01 Observable Artifact Contract（可观测产物契约）**
- 内容：每个 agent 蓝图声明其产出为契约（shape、format、path_glob、index_path、schema，路径相对单元根）；产出该阶段的 agent 写 index.json；生成器聚合契约进 pomasa.json。
- 正文包含 3.3、3.4 的完整约定。
- 必要性：Required。

**OBV-02 Work Unit Decomposition（运行单元规划）**
- 内容：运行如何划分是 MAS 的设计决定，由描述符 work 段声明（mode、dimensions、units、units_index、unit_layout）。single 与 multi 两种形态，多注重按维嵌套；单元可预声明或运行期枚举。
- 正文包含 3.1、3.2 work 段的 schema 与时机。
- 必要性：Required。

**OBV-03 Run Manifest（运行清单）**
- 内容：单元根内写 run.json 状态机，orchestrator 在阶段边界维护；单元根自包含（阶段目录）。
- 正文包含 3.5 的 schema 与时机。
- 必要性：Required。

配套变更：
- pattern-catalog/README.md 增加 OBV 分类与索引。
- SKILL.md 生成指令提及三模式为必选，要求生成器产出 pomasa.json 与蓝图契约声明，并在生成 prompt 中引导用户回答运行单元规划（一次跑完，还是按国、按日期拆，拆哪些单元）。
- 模式正文里的元数据 schema 标版本（obv-1）。

本轮不新增：干预通道（GUI 结构化指令与自由对话的双通道纪律，后续随 BHV 模式出）、事件流细化、契约演示组件库、单元生命周期（保留策略，如只留最近 N 期）、BHV-08 wiki 整合（结构偏复杂，Studio 创建时不提供该选项，以普通阶段产物替代知识库需求）。

## 5. 设计决策（2026-08-28 定稿）

1. 运行单元模型：run 不再有强制 run-id 层，改为 work 段声明（single / multi + dimensions），单元目录键用含义名（国家、日期）。跨单元汇总需求当前不存在，不预建机制。
2. 不设 output 目录：最终报告就是末阶段普通产物（如 05.report/final_report.md），docx / pdf 导出是查看器功能，MAS 不产出交付格式文件；user_input 里的"交付物格式"整块从新建表单去掉，输出统一为 Markdown。
3. run.json 只存状态机，不复制产物条目，产物以各阶段 index.json 为准。
4. index.json 由阶段 agent 写，run.json 由 orchestrator 写，插件不代写（仅降级兜底）。OBV 三模式均为必选是此条成立的前提。
5. 新建表单用 user_input 全量字段（去掉输出格式），留空项由生成器兜底"由 AI 建议"。wiki（BHV-08）不提供。
6. 会话日志可折叠展开，生成与运行会话同一处理，默认收起，展开含 AI 思考过程（如运行时提供）；日志是追溯面板，不参与状态推导。
7. （2026-08-29）DSH 集成形态：Studio 拆成左导航右详情的分栏工作台；同一工作台挂在 `conversation.view`（会话内主形态，留 DSH 会话树可见）与 `shell.overlay`（footer 有界冷启动面板）两个槽位。全屏覆盖层（旧 `.ps-app-overlay`）废弃。选 shell.overlay 而非"打开会话跳 tab"是因为 DSH 0.1 对空白会话不渲染 tab 条，冷启动无解。详见 UI.md「DSH 平台要点」。
8. （2026-08-29）会话与状态模型：每个 MAS 同一时刻只关联一个活会话。**一次 `run.start` = 对一个单元的一次运行，永远人手发起，绝不批量或自动续跑**（multi 一次传多个单元直接拒绝；客户端"运行"按钮只运行当前选中单元）。MAS 状态由会话生命周期 + 文件事实推导，共六态：`generating` / `gen-failed` / `idle` / `running` / `run-failed` / `completed`（语义见 decision 8 上文）。死会话判定：宿主内存会话表（`genSessions`/`runSessions`）+ run.json 终态；宿主重启后以 run.json 为准。运行标识：单元键（含义名）+ run.json 的时间戳即一次运行的身份；同一单元重跑会覆盖该单元记录。

## 附录 A：生成端到端测试结论（2026-08-28）

用全新模型子代理（只读 SKILL.md 与模式目录，不掺任何 OBV 提示）生成 llm_south 研究 MAS，验证"模式驱动生成"成立。测试环境 /tmp/pomasa-gen-e2e/，结果：

- 9/9 Required 模式全采纳，含 OBV 三条。
- pomasa.json 合法，schema_version obv-1，work {mode: single}，8 阶段各带契约，契约路径相对单元根。
- orchestrator 蓝图内嵌 run.json 维护协议（初始写入、每阶段边界 completed 加时间戳、收尾封口）；9 份蓝图全部维护 index.json。
- README 含 Built with POMASA 溯源块。

实现前注意事项：

1. 契约 id 键名：生成器产出 pomasa.json 时用 `artifact` 字段镜像蓝图 Artifact 标签（DESIGN 3.2 示例写的是 `id`）。实现读取端两个都接受，或以 `artifact` 为准。
2. 交付格式：user_input 不声明"仅 Markdown"时，生成器会照常采纳 STR-09 并产出 _output/ 与导出管线。Studio 的 mas.create 生成 user_input 时必须写死交付格式 = markdown，否则生成的 MAS 自带 Studio 已声明不需要的导出管线。