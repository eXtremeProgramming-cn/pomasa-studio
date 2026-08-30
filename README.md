# POMASA Studio

[ EN | [中文](./README.zh-cn.md) ]

POMASA Studio is a [dsh](https://github.com/deepseek-ai/deepseek-harness) (DeepSeek Harness) plugin that brings a POMASA research workbench into dsh. It manages every POMASA research multi-agent system (MAS) under `~/.pomasa` on this machine: list existing MASes, create new ones from a request, follow run status, and inspect stage outputs.

![POMASA Studio workbench](image.png)

## Features

- List every MAS under `~/.pomasa` with its run status and last-run time.
- Describe a research request in a form and let the POMASA generator build a self-contained multi-agent system from the pattern catalog.
- Run a MAS as a whole, or split it into units; run sessions are visible in the dsh sidebar.
- Inspect each stage's artifact contracts and actual outputs; download Markdown directly.
- The UI is bilingual (Chinese/English), switchable from the bottom of the left nav.

## Installation

Prerequisites: dsh installed and configured, and a POMASA `~/.pomasa` home directory on the machine (the POMASA host layer creates it).

```bash
dsh plugin --profile <profile> add /path/to/pomasa-studio
```

Replace `<profile>` with the target profile name (e.g. `web`, `desktop`), then start that profile. The dsh footer gains a POMASA Studio button in the bottom-left corner.

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