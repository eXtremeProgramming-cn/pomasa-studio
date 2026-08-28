# pomasa-studio 端到端测试方案

状态：v0.1（2026-08-28）。依据：harness 官方 `docs/testing.md`（对用户可见的插件必须做真实组合测试），以及 workspace 内现有插件的验证实践调研。

## 0. 结论

用户判断正确：用 web profile + Playwright 做端到端。这不仅是可行路径，而且是 harness 官方文档明确要求的形态。比"只做浏览器 E2E"更完整的是分层金字塔，四层从小到大：

```
L1 单元（node，快，无 DSH）
L2 host 集成（node，mock ctx，无 DSH）
L3 transport 冒烟（真实 dsh web + curl）
L4 浏览器 E2E（Playwright + 真实 dsh web）
    ├── L4a seeded fixture（确定性、无模型调用、秒级）
    └── L4b live 冒烟（真实 LLM，真生成真运行，分钟级）
```

原则：`docs/testing.md` 的 "prefer real implementation over mock" 意味着 L4 必须是真实 dsh web 组合，L1/L2 的 mock 只能当快速回归层，不能冒充实测定案。

## 1. 分层设计

### L1 单元测试（node）

目标：`~/.pomasa` 文件契约的纯逻辑。

- pomasa.json / run.json / index.json 的解析与 schema 校验（必填字段、status 枚举、work 模式解析）
- 路径解析：契约相对单元根、single/multi 的基址解析、两层 multi（`["country","year"]`）嵌套
- artifact.read 的路径穿越防护（解析后必须落在 masId、单元根内）
- registry.json 操作与推导
- 手段：node:test + 临时目录。零浏览器零 DSH。
- 产出：`npm run test:unit`

### L2 host 集成测试（node，mock ctx）

目标：host 端 RPC 全生命周期，不依赖 DSH 与浏览器。

- mas.create → 断言生成会话被创建（mock agentLoop 记录 create 调用与参数）
- run.start → 断言运行会话创建、单元目录建立
- 手工写入 run.json / index.json 模拟产物 → unit.state 返回正确阶段的产物与状态
- run.intervene 原样透传、run.cancel 生效
- artifact.read 越界路径被拒
- 手段：照抄 pictor verify.mjs 的 ctx Proxy 桩（inject 白名单强约束）+ 内存或临时 fs。
- 产出：`npm run test:host`

### L3 transport 冒烟（真实 dsh web + curl）

目标：插件 bundle 挂载、RPC 通道注册、client bundle 可访问。专门治"浏览器能看到 tab 但每个调用 405 / transport failure"类 bug。

- 临时 profile 挂载本插件 → `dsh --profile web --no-open --port 0` 后台起真实 host → 轮询就绪 → curl 插件端点断言 `{ok:true}` 与 `{ok:false,error}` 包络 → 首页 HTML 含 `/plugins/dsh-pomasa/client.js`。
- 手段：pictor `scripts/transport-smoke.sh` 模式照搬。
- 产出：`npm run test:transport`

### L4a 浏览器 E2E，seeded fixture（确定性）

目标：不依赖模型调用与真实生成，把整个 UI 状态空间遍历一遍。

- 预置一个 fixture MAS 进临时 harnessHome 的 `~/.pomasa/`：pomasa.json（single 模式，8 阶段）+ 一个已完成 run（run.json 状态机 + 各阶段 index.json + 若干产物 md）。
- 直接复用 `/tmp/pomasa-gen-e2e/llm_south`（生成测试产物）手工构造 fixture。
- Playwright 起临时 profile 的真实 dsh web（无需 LLM key，因为 fixture 不触发新会话），断言：
  1. 会话区内出现 POMASA tab，与 Chat / Trajectory 并列
  2. MAS 列表渲染 fixture 条目与状态徽记
  3. 进入详情：阶段条渲染、run 选择器、产物卡数量与内容（由 index.json 驱动）
  4. 点开产物 → 内容查看器（md 渲染）→ 导出 docx/pdf 按钮存在
  5. 页面刷新（模拟重启）后状态从文件恢复
- 产出：`npm run test:e2e`

### L4b 浏览器 E2E，live 冒烟（真实 LLM）

目标：从空态到产物出现的完整旅程，真金白银。

- 用真实 profile（含可用的 llm provider），真实填写新建 MAS 表单 → 生成会话跑完 → MAS 入列表 → 发起运行 → 各阶段状态更新 → 产物出现。
- 生成 + 运行耗时以分钟计，只在显式调用时跑。
- CI / 无 key 环境的替代：照 harness 的 `installLlmReplay` 做模型响应回放（record/replay），把真实调用降级为确定性。该项列为后续增强，不作为首版门槛。
- 产出：`npm run verify:live`

## 2. 执行骨架

```
e2e/
├── fixture-mas/           # fixture MAS：pomasa.json + runs/<run-id>/{run.json, 阶段目录/index.json, 产物}
├── servers.mjs            # 起/停 dsh web：临时 profile 挂载插件，--no-open --port 0，读实际端口
├── playwright.config.ts   # webServer 命令 + chromium project + trace/screenshot on failure
└── specs/
    ├── tab.spec.ts        # L4a 断言 1
    ├── list.spec.ts       # L4a 断言 2
    ├── detail.spec.ts     # L4a 断言 3-5
    └── live.spec.ts       # L4b
```

关键点：
- conversation.view 只在会话内出现，Playwright 需先创建/打开一个会话（照 harness `apps/web/tests/plugin-config.e2e.ts` 的导航方式）。
- 临时 profile 挂载用 pnpm link 本地路径（照现有 web profile 的 `link:` 惯例），避免污染用户真实 profile。
- fixture dataRoot 注入：servers.mjs 在启动前把 fixture-mas 拷进临时 harnessHome 的 `~/.pomasa/`。

## 3. 验证矩阵

| 功能 | L1 | L2 | L3 | L4a | L4b |
|---|---|---|---|---|---|
| 文件契约解析 | ✅ | ✅ | | | |
| 路径防穿越 | ✅ | ✅ | | | |
| RPC 生命周期 | | ✅ | | | |
| bundle 挂载 / 通道 | | | ✅ | ✅ | ✅ |
| tab 出现 | | | | ✅ | ✅ |
| 列表 / 详情 / 查看器渲染 | | | | ✅ | ✅ |
| 真实生成与运行 | | | | | ✅ |
| 重启恢复 | | | ✅ 兜底 | ✅ | |

## 4. 已知要点与风险

- harness 官方只有内部 web E2E（`apps/web/tests`），外部插件 repo 没有现成公开先例，本方案是其轻量复刻；`launchWebScaffold` 在 harness monorepo 内，跨仓库直接复用成本高，所以自建 servers.mjs。
- live 测试慢：生成加运行可能数分钟，且依赖真实 provider 可用；失败时不一定是插件 bug，需能看会话日志区分。
- web profile 默认端口 3080，测试一律用 `--port 0`（OS 分配），杜绝端口冲突。
- 浏览器 E2E 首版以 chromium 单浏览器为标准，桌面 profile 与 web 共享同一套 host 与槽位，不另测。

## 5. 运行条件与已知要点

**L4a 的实际运行方式**：本机 dsh 的 web UI 只在"打开一个真实会话"后渲染对话场景条（Chat/Trajectory/POMASA）。因此浏览器 E2E 无法在空 profile 上复现。servers.mjs 支持两种启动模式：

- 默认：最小 web profile + 插件（无会话，场景条不出现），适合 curl 探活与 host 冒烟。
- `POMASA_E2E_SRC_HOME=user`：把用户 `~/.dsh` 的 settings.yaml + sessions + storages（排除 profiles 与 node_modules，节省磁盘）拷贝进临时 home，由 dsh 重建最小 web profile 并挂载本插件。界面即与桌面端一致，可打开真实会话、点出 POMASA tab。这是 L4a 的推荐跑法：

```bash
POMASA_E2E_SRC_HOME=user npx playwright test --config=e2e/playwright.config.ts studio
```

**L4b live 的运行条件**：需要真实 LLM provider 的 API key 出现在运行环境（`MAKU_BAILIAN_API_KEY`），否则生成会话无法鉴权、静默空转。spec 已按该环境变量门控，未设置则跳过。真实生成耗时以分钟计。

已知不稳定性：会话打开依赖 DSH UI 加载时序，偶发 skip；重跑即可。

## 6. 与手动验证的关系

L1-L4 覆盖自动路径；仍保留一个手动检查项：在用户真实 Desktop profile 里跑一遍 live 冒烟，确认真实使用形态无差异。该检查列为发版 checklist，不进自动化。