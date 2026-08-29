# pomasa-studio

POMASA 的 DSH 插件，远期包成"研究工作台"。管理 `~/.pomasa` 下所有 POMASA MAS：列表、新建（user_input 到生成器）、运行状态、阶段产物展示。

## 当前状态（2026-08-28）

- host 侧完成：`~/.pomasa` 数据层（描述符/单元/运行状态/防穿越）+ `/pomasa` HTTP API + 生成/运行会话编排（agentLoop）
- client 侧：2026-08-29 起工作台改为**左导航右详情**的分栏形态，唯一入口是左下角 `POMASA Studio` 按钮打开的 `shell.overlay` 有界面板（有界不遮挡、任意界面状态可达，会话内 tab 已移除）——见 [UI.md](./UI.md)「最终界面形态」与 [DESIGN.md](./DESIGN.md) 决策 7
- 数据契约由 [OBV-01/02/03](./01.tools/pomasa/skills/pomasa/pattern-catalog/) 定义（已在 pomasa 仓库定稿并推送）
- 设计文档 [DESIGN.md](./DESIGN.md)、测试方案 [TESTING.md](./TESTING.md)、UI 选型 [UI.md](./UI.md)

## 验证

```bash
npm run build:client # 重新生成 lib/client.js（已提交）
npm run verify       # L1 单元 + L2 host 集成 + client bundle 冒烟（无 DSH）
npm run test:transport   # L3：封闭起的真实 dsh web + curl（不碰真实 profile）
npm run test:e2e:install # 一次性装 @playwright/test + chromium
npm run test:e2e         # L4a：Playwright 浏览器 E2E（fixture 数据）
```

## 安装进 web profile（本地开发）

```bash
dsh plugin --profile web add /Users/gigix/Projects/01.tools/pomasa-studio
dsh web
```

## 结构

```
src/host/         host 半：apply.js（API）+ core/（数据层）
src/client/       浏览器半：三页面 + 组件 + 迷你 md 渲染器
skill/            POMASA skill 快照（钉版本，生成可复现）
e2e/              L4 浏览器测试：fixture-mas + servers.mjs + specs
scripts/          bundle-client.mjs、transport-smoke.sh
```

## 与前身的关系

`01.tools/POMASA_Observatory` 是概念验证实验，废弃。本仓库为正式版。