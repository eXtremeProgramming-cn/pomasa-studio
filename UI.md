# pomasa-studio UI 选型

状态：2026-08-28 定。

## 结论

不引入第三方 UI 库作为运行时依赖。组件全部自写，样式 token 全部用 DSH 主机的 `--dsw-alias-*` CSS 变量，视觉按 Geist 比例、shadcn 结构。构建保持简单拼接，不引 esbuild。

## 决定性约束

DSH client 槽位规范（`deepseek-harness/packages/extensions/cordis-client-runner/src/client/slot-catalog.ts`）原文："You cannot `import` anything, so the design-system components are out of reach: build markup with `React.createElement` and ship CSS through `styles.insert(css)`. Use the theme CSS variables (`var(--dsw-alias-bg-layer-1)`, `var(--dsw-alias-label-primary)`, …) instead of literal colors"。

由此：

- 第三方库只能"构建时 inline 打进 client.js"一条路，运行时模块注册表里只有宿主提供的东西。
- 库自带的设计系统（MUI theme、AntD token、Mantine Provider）与 DSW token 体系互相独立。不打通就双主题维护，打通等于重写它的主题适配层。

## 候选考察（2026-08 状态）

| 候选 | 结论 | 理由 |
|---|---|---|
| Ant Design / MUI | 否 | 400KB+ 量级，自带主题体系，与 DSW token 双轨维护；研究工作台未来可换完整技术栈，插件期不应背上迁移税 |
| Mantine | 否 | 同类组件库中包体最大，自带 Provider 主题系统，同上 |
| shadcn/ui | 否（取其精神） | 不是运行时库，是 Tailwind + 贴片组件；Tailwind 与"样式注入 + 宿主 token"模型冲突。其"组件源码归你"的哲学照搬：结构化组件自己写 |
| Radix primitives | 暂缓 | headless 的行为质量好，但 inline 打包加 __ModuleLoader__ 工厂格式适配有成本；本场景只需 dialog、collapsible、tabs 三四种简单部件，手写 a11y 边界可控。研究工作台若出现复杂控件（combobox、弹层）再引入不迟 |
| HeroUI / Chakra | 否 | 同 MUI 类，自带 theme 体系 |
| Geist（Vercel） | 借比例不借代码 | 大字号层级、单一强调色、疏朗留白，正是"研究工作台"观感的现成参照，把规则移植进自有 CSS |

## 组件规划（自写，全部用 token 变量）

PageHeader、Card、Button（primary / ghost）、Badge、StatusDot（等待/运行中/完成/失败/生成中）、EmptyState、Field（Input / Textarea / Select）、StageStrip、ArtifactCard、ArtifactViewer（内嵌迷你 Markdown 渲染器，React 元素输出，杜绝 innerHTML XSS）、LogPanel（可折叠）、RunSelector、干预输入框。

## 视觉规则（写码强制）

1. 基准字号 16px；页标题 28px semibold、区块标题 20px semibold、卡片标题 16px medium；不做 14px 以下正文。
2. 行高 1.6 起步；卡片内边距 20px 起步；区块间距 28px 起步；内容最大宽度约 1024px 居中。
3. 圆角 12-16px；描边与背景层级全部用 `--dsw-alias-border-l2/l3`、`--dsw-alias-bg-layer-*`，明暗主题自动跟随。
4. 单一强调色 `--dsw-alias-brand-primary`（或 `state-business-primary`）；状态徽记用 `state-success/error/warn` 但降饱和。
5. 动效克制：hover 亮度过渡 150ms，无花哨入场。
6. 空态：几何图形 + 一句引导文案。

## 已知 token（自 harness apps/web 枚举）

- 背景：`bg-base`、`bg-layer-1/2/3`、`bg-overlay`
- 描边：`border-l1/l2/l3/l4`
- 文字：`label-primary`、`label-dimmed`、`label-caption`、`label-primary-dimmed`
- 强调：`brand-primary`、`state-business-primary`
- 语义：`state-success-primary`、`state-error-primary`、`state-warn-primary`
- 按钮：`button-primary-fill`、`button-primary-hover`
- 交互：`interactive-bg-hover`

## 最终界面形态（2026-08-29 定稿）

### 两处渲染面（同一套 Studio 工作台）

Studio 是分栏工作台：左栏 `.ps-nav` MAS 导航（状态点、单元数、上次运行、新建/删除），右栏 `.ps-main` 详情（`.ps-info-bar` 信息条、运行控制、`.ps-stages` 阶段条、`.ps-panel` 产物卡+查看器、蓝图弹窗）。新建表单也在右栏内（非弹窗非整页）。同一 `StudioRoot` 挂在两个槽位：

1. **`conversation.view` tab**（id `pomasa-studio`, order 30）：会话内、占正文区，左侧 DSH 会话树始终在屏，顶部 tab 条一键切回 Chat。这是"回普通会话看操作过程"的主路径。
2. **`shell.overlay` 冷启动面板**（id `pomasa-studio`, order 10）：footer 底部按钮开关。**关键平台约束**：DSH 0.1 对空白会话（`blank && composerPhase==='blank'`）不渲染会话头部与 view ring，故 tab 只在"有对话内容的会话"里出现；面板补足冷启动/空白态。面板是**有界**的：`.ps-shell-root` 全帧 click-through（pointer-events:none），左 264px `.ps-shell-nav` 透空保持侧栏可见可点（侧栏宽 clamp(264,420)，收起为 56px rail），右侧 `.ps-shell-panel` 才 pointer-events:auto。不遮挡、不占屏，任意界面状态可达。

footer 按钮自身 `.ps-footer-action.on` 表激活。`sidebar.footer.action`（order 20）只做面板开关，不调 workspaces/sessions 服务（早期尝试"自动开会话+预置 view"，因空白会话门控而放弃，见下）。

**创建入口**：`新建 MAS` 按钮**永远在左栏导航头**，右栏任何空态都不放按钮（零 MAS 时右栏是纯引导 hero，指向左栏按钮）。全屏因此只有一处创建入口，无重复。

### 工作台激活时隐藏输入区

对齐 dsh-editor 先例，POMASA tab 活跃时隐藏 composer：
`[data-conversation-scroll]:has(.ps-workbench) > [data-composer-seat] { display:none !important; }`
（壳层面板在 scroll 容器外，`.ps-workbench` 不会误触该规则。）

### DSH 平台要点（踩坑记录，供后续开发）

- `shell.overlay` 层 z-index 20、`position:absolute;inset:0`、pointer-events:none，其直接子元素被强制 pointer-events:auto（`.pI_x6G_overlayLayer > *`）。要留透空区，必须 `pointer-events:none !important` 覆盖。
- workspaces 服务是快照仓库：`ctx.get('workspaces').list.getSnapshot().items`；`connectWorkspace(workspaceId)` 返回 reuse-or-create 的会话 id，随后 `ctx.get('sessions').open(id)`。`workspacesSvc.create` 入参是 `{ path }`（不是裸字符串，Workspace 构造会 `'workspaceId' in source`）。
- 会话有内容前 tab 条不可达；`dsh.conversation.chat.<sessionId>` 是 per-session chat store 的 localStorage persist 键，若想预置 view 必须填全 `{selection:null, draft:'', view, inspect:null}` 否则 composer 崩。
- e2e：DSH 0.1 冷环境启动弹两个顶层模态（Internal Testing Notice→Continue、Add an API key→Configure later），其 mask z-index 1000 冻结一切点击，helper 必须先关。

### 测试命令

```bash
npm run build:client   # 重拼接 lib/client.js（纯拼接，无 import）
npm run verify         # L1+L2：17 项
npm run test:transport # L3：真实 dsh web + curl
npm run test:e2e       # L4：Playwright（fixture 数据；已修 package.json 指向 e2e/playwright.config.ts）
```