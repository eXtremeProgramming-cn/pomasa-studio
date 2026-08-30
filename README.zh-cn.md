# POMASA Studio

[ [English](./README.md) | 中文 ]

POMASA Studio 是 dsh（DeepSeek Harness）的一个插件，把 POMASA 研究工作台带进 dsh。它管理本机 `~/.pomasa` 下的所有 POMASA 研究多代理系统（MAS）：列出已有系统、从需求新建、跟随运行状态、查看各阶段产物。

![POMASA Studio 工作台界面](image.png)

## 功能特性

- 列出 `~/.pomasa` 下的全部 MAS，展示运行状态与上次运行时间。
- 用表单描述研究需求，让 POMASA 生成器按模式目录产出一个自包含的多代理系统。
- 支持单次整体运行与多单元拆分两种运行方式，运行会话在 dsh 侧栏可见。
- 查看每个阶段声明的产物契约与实际产物，Markdown 可直接下载。
- 界面中英双语，左侧导航底部一键切换。

## 安装

前置条件：已安装并配置好 dsh；本机已有 POMASA 的 `~/.pomasa` 数据目录（POMASA 的 host 层会创建它）。

```bash
dsh plugin --profile <profile> add /path/to/pomasa-studio
```

把 `<profile>` 换成目标 profile 名（如 `web`、`desktop`）。然后启动该 profile，dsh 左下角会出现 POMASA Studio 入口按钮。

## 使用

1. 启动 dsh 后，点击左下角的 POMASA Studio 按钮，打开工作台。
2. 左侧导航列出已有 MAS；点击顶部的"新建 MAS"，填写研究需求，生成器会按 POMASA 模式生成整个系统，生成进度在 dsh 会话区可见。
3. 在左侧选择一个 MAS，右侧显示运行状态、单元、各阶段产物与内容。
4. 阶段产物以 Markdown 呈现，可下载；阶段名旁的按钮可查看对应 agent 蓝图。
5. 导航底部可切换界面语言：中文 / English。MAS 自身的内容（系统名、产物标题）保持原语言，只翻译工作台界面。

## 文档

- 设计与决策：[docs/DESIGN.md](docs/DESIGN.md)
- 界面选型：[docs/UI.md](docs/UI.md)
- 测试方案：[docs/TESTING.md](docs/TESTING.md)
- 开发者文档（结构、验证命令）：[docs/DEVELOPING.md](docs/DEVELOPING.md)