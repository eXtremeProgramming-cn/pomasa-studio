# pomasa-studio 开发者文档

这份文档面向在本仓库上开发的人。使用者请读仓库根 [README.md](../README.md)。

## 当前状态（2026-08-30）

- host 侧完成：`~/.pomasa` 数据层（描述符/单元/运行状态/防穿越）+ `/pomasa` HTTP API + 生成/运行会话编排（agentLoop）。
- client 侧：工作台为左导航右详情的分栏形态，唯一入口是左下角 POMASA Studio 按钮打开的 `shell.overlay` 界面板（有界不遮挡、任意界面状态可达，会话内 tab 已移除）。见 [UI.md](./UI.md) 与 [DESIGN.md](./DESIGN.md) 决策 7。
- 界面双语：中文/英文两套文案，左侧导航底部切换，选择持久化到 `localStorage`（key `pomasa-lang`，默认中文）。只翻译工作台壳层，MAS 自身内容保持生成时的语言。
- 新建 MAS 的 user input 隐含注入 STR-08（Pandoc-Ready Markdown）：引用文献必须用 pandoc 脚注，报告输出符合 pandoc 规格。见 [STR-08 模式](https://github.com/eXtremeProgramming-cn/pomasa/tree/main/skills/pomasa/pattern-catalog)。
- 数据契约由 [OBV-01/02/03](../../01.tools/pomasa/skills/pomasa/pattern-catalog/) 定义（在 pomasa 仓库定稿并推送）。

## 结构

```
src/host/         host 侧：apply.js（API）+ core/（数据层、prompt、skill、paths）
src/client/      浏览器侧：主入口 + 页面 + 组件 + 迷你 md 渲染器 + i18n.js
skill/            POMASA skill 快照（钉版本，生成可复现）
e2e/              L4 浏览器测试：fixture-mas + servers.mjs + specs
scripts/          bundle-client.mjs、transport-smoke.sh
fixtures/         测试用 mock 生成骨架（fast generation）
lib/              构建产物（.gitignore）；host 入口 index.js 是 src 的薄再导出，client.js 由构建生成
verify.mjs        L1 单元 + L2 host 集成 + client bundle 冒烟
docs/             DESIGN.md、UI.md、TESTING.md、本文件
```

## 验证

```bash
npm run build:client      # 重新生成 lib/client.js（若改动 src/client/*）
npm run verify            # L1 单元 + L2 host 集成 + client bundle 冒烟（无 DSH）
npm run test:pack         # 打包完整性：tarball 必带 skill/、lib/、pomasa-home/ 等（无 DSH）
npm run test:install      # L5：README 安装路径全链路（打包 → dsh plugin add → 真实 dsh web 启动断言）
npm run test:transport    # L3：封闭起的真实 dsh web + curl（不碰真实 profile）
npm run test:e2e:install  # 一次性装 @playwright/test + chromium
npm run test:e2e          # L4a：Playwright 浏览器 E2E（fixture 数据）
npm run hooks:install     # 一次性启用 pre-push 钩子（git config core.hooksPath .githooks）
```

分层测试方案见 [TESTING.md](./TESTING.md)。

## 安装链路 CI（L5）

`npm run test:install` 复现 README 的用户安装路径：把当前仓库 `npm pack` 成 tarball（`files` 白名单随之生效），在临时 `DSH_HOME` 里 `dsh plugin --profile web add <tarball>`，启动真实 dsh web，断言插件树加载、`/pomasa` 通道与 client bundle 正常。全程不碰真实 profile，临时目录退出即清。缺 `POMASA_INSTALL_SPEC` 时测本地包（即正被推送的代码）；设成 registry spec（如 `pomasa-studio@0.2.3`）时测已发布包（发版后验证 README 原样流程）。

pre-push 钩子（`.githooks/pre-push`）在每次 push 前依次跑 `npm run verify` 与 `npm run test:install`，作为本项目 CI。本机没有 dsh/pnpm 时 install smoke 自动跳过（`POMASA_SKIP_INSTALL=1` 可显式跳过）。

## 本地开发安装

```bash
dsh plugin --profile web add ~/Projects/03.systems/pomasa-studio
dsh web
```

desktop profile 采用 pnpm link 方式安装（`link:~/Projects/03.systems/pomasa-studio`），改动即时生效，重启 profile 生效。移除插件时改 profile 的 `package.json`（dependencies 与 `dsh.profile.bundles`）后 `pnpm install`，再手工清掉 pnpm 不清理的 link 符号链接。

## 双语规范（改动 client 文案时必读）

- 文案不写在组件里，写到 [i18n.js](../src/client/i18n.js) 的 `I18N_ZH` / `I18N_EN`。
- 组件渲染时用 `t('key')`，需要重渲染的根组件挂 `useLang()`。
- 状态文本映射（`MAS_STATUS_TEXT`、`STAGE_STATUS_TEXT`）已改为返回函数，取值处要加调用括号。
- 表单默认值是 Studio 提供的文字，也进 i18n 字典，且"未被编辑的默认项"会跟随界面语言切换。
- 新增 bundle 文件记得同步 `scripts/bundle-client.mjs` 与 verify.mjs 的 client 源码清单。