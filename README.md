# POMASA Studio

[ EN | [中文](./README.zh-cn.md) ]

POMASA Studio is a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that brings a POMASA research workbench into dsh. It manages every POMASA research multi-agent system (MAS) under `~/.pomasa` on this machine: list existing MASes, create new ones from a request, follow run status, and inspect stage outputs.

![POMASA Studio workbench](image.png)

## Features

- List every MAS under `~/.pomasa` with its run status and last-run time.
- Describe a research request in a form and let the POMASA generator build a self-contained multi-agent system from the pattern catalog.
- Run a MAS as a whole, or as separate isolated runs per research object; run sessions are visible in the dsh sidebar.
- Inspect each stage's artifact contracts and actual outputs; download Markdown directly.
- The UI is bilingual (Chinese/English), switchable from the bottom of the left nav.

## Installation

**Recommended for non-technical users**: install [DSH Desktop](https://dshdesktop.com/en/) and let the agent install the plugin for you. DSH Desktop bundles the DeepSeek Harness runtime in a ready-to-run desktop app (a community project, not an official DeepSeek product), so starting the workbench needs no terminal.

Start DSH Desktop, open a conversation, and send this one message:

> Install the POMASA Studio plugin for me. The source repository is https://github.com/eXtremeProgramming-cn/pomasa-studio. Clone or download it, then build the client bundle by running `node scripts/bundle-client.mjs` inside the repo (the browser bundle is generated, not committed). Add the plugin to the current profile with `dsh plugin --profile desktop add <path>`, restart if needed, and confirm when a POMASA Studio button appears at the bottom left.

The agent does the terminal work from there.

If you would rather install it yourself: DSH Desktop also bundles the `dsh` CLI and a built-in terminal. From a terminal with dsh available, run:

```bash
dsh plugin --profile desktop add /path/to/pomasa-studio
```

For a standalone dsh install (via npm or npx), the same command installs into any profile:

```bash
dsh plugin --profile <profile> add /path/to/pomasa-studio
```

Replace `<profile>` with the target profile name (e.g. `desktop`, `web`), then start that profile. The dsh footer gains a POMASA Studio button in the bottom-left corner. A POMASA `~/.pomasa` home directory is created by the host layer on first use.

## Usage

1. Start dsh and click the POMASA Studio button at the bottom left to open the workbench.
2. The left nav lists existing MASes. Click "New MAS" at the top, fill in the research request, and the generator builds the whole system from the POMASA patterns; progress is visible in the dsh session area.
3. Select a MAS on the left to see its run status, units, and per-stage artifacts on the right.
4. Stage artifacts render as Markdown and can be downloaded; next to each stage name a button opens its agent blueprint.
5. Switch the UI language from the bottom of the nav: 中文 / English. MAS content (system names, artifact titles) keeps its own language; only the workbench chrome is translated.

## Documents

- Design decisions: [docs/DESIGN.md](docs/DESIGN.md)
- UI choices: [docs/UI.md](docs/UI.md)
- Testing plan: [docs/TESTING.md](docs/TESTING.md)
- For developers (structure, verification commands): [docs/DEVELOPING.md](docs/DEVELOPING.md)