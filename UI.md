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