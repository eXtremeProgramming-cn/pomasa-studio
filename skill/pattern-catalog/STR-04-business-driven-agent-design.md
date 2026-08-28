# Business-Driven Agent Design

**Category**: Structure
**Necessity**: Recommended

## Problem

How many Agents should there be? What should each Agent be responsible for?

A common mistake is dividing Agents by technical roles, such as "one Data Collector, one Analyzer, one Reporter." This coarse-grained division ignores the actual complexity of business processes. For example, users may require data collection to proceed in three steps: first form an overall perception, then refine a question list, and finally conduct deep collection—these three steps have different inputs, outputs, and execution strategies. If all are crammed into a single "Data Collector", the Agent becomes bloated, difficult to maintain, and intermediate artifacts become invisible.

## Context

This pattern applies in the following scenarios:

- Business processes have clear step divisions
- Different steps have different inputs, outputs, and execution strategies
- Need to preserve and review intermediate artifacts from each step
- Desire a clear system structure that is easy to understand and maintain

## Forces

- **Fine granularity vs coordination cost**: The finer the Agents, the clearer the responsibilities, but the higher the coordination cost
- **Business alignment vs technical reuse**: Tight adherence to business may make Agents difficult to reuse
- **Intermediate artifacts vs execution efficiency**: Preserving intermediate artifacts increases I/O but improves reviewability
- **Explicit structure vs flexibility**: Fixed Agent structure is clear but may not be flexible enough

## Solution

**The number of Agents and their responsibility division should follow the natural boundaries of business processes, not coarse-grained technical classifications. Each business step corresponds to one Agent, and each Agent has an independent output directory.**

### Core Principles

1. **One business step = One Agent**
   - Each step with an independent goal described by the user should be a separate Agent
   - Avoid "large and comprehensive" generic Agents

2. **Each Agent has a clear single responsibility**
   - Clear input: Where to read data from
   - Clear output: What to produce and where to write it
   - Clear responsibility: What task to complete

3. **Each Agent's output is stored independently**
   - Directory structure reflects Agent structure
   - Intermediate artifacts can be independently reviewed and reused

### Agent Numbering Specification

**One Agent group = One complete process with an independent goal**

Each group of Agents has its own Orchestrator and execution sequence. Groups have independent goals and execution timing, passing intermediate results only through data directories.

**First group (00-09)**:
```
agents/
├── 00.orchestrator.md      # Orchestrator for the first group
├── 01.initial_scanner.md   # Numbered by execution order
├── 02.question_designer.md
├── 03.deep_researcher.md
├── 04.analyzer.md
├── 05.reporter.md
└── 06.quality_checker.md   # Quality check is part of the process, in main sequence
```

**Second group (10-19)**: A completely independent process with different goals
```
agents/
├── 10.orchestrator.md      # Orchestrator for the second group
├── 11.paper_outliner.md    # Agents in second group, numbered by execution order
├── 12.section_writer.md
└── 13.paper_integrator.md
```

**Numbering principles**:
- `00`, `10`, `20`...: Orchestrators for each group
- `01-09`, `11-19`, `21-29`...: Agents within each group, numbered by execution order
- Each group is an independent, complete process with its own goal
- Groups pass results through data directories but have independent execution timing and frequency

**When to split into groups**:
- Two processes have fundamentally different goals (e.g., "generate assessment report" vs "write academic paper")
- Different execution timing (e.g., assessment report generated monthly, paper written on demand)
- Different execution frequency
- Can run independently, don't need to always execute together

### Directory Structure Correspondence

Agent numbers correspond to data directories:

```
workspace/
├── 01.initial_scan/        # Output from 01.initial_scanner.md
├── 02.question_list/       # Output from 02.question_designer.md
├── 03.deep_research/       # Output from 03.deep_researcher.md
├── 04.analysis/            # Output from 04.analyzer.md
└── 05.reports/             # Output from 05.reporter.md
```

## Consequences

### Benefits

- **Clear structure**: System structure directly reflects business process
- **Clear responsibilities**: What each Agent does is immediately obvious
- **Visible intermediate artifacts**: Output from each step can be independently reviewed
- **Easy to debug**: Problems are easily traced to specific Agents
- **Easy to maintain**: Modifying a step only requires changing the corresponding Agent
- **Supports incremental development**: Can develop and test Agents one by one

### Liabilities

- **Increased number of Agents**: May have many Agent files
- **Coordination complexity**: Orchestrator needs to coordinate more Agents
- **Potential over-splitting**: Simple tasks don't need overly fine splitting

## Implementation Guidelines

### Deriving Agent Structure from User Requirements

**User input example**:
```markdown
**Data collection process design**:

Proceed in three phases:
1. Collect basic information about the target industry, form preliminary overall perception
2. Refine question lists for each function
3. For each functional item, conduct comprehensive and in-depth information collection

After all materials are collected, a separate quality inspection process should be initiated.
```

**Derived Agent structure**:
```
agents/
├── 00.orchestrator.md       # Orchestrate the entire process
├── 01.initial_scanner.md    # Step 1: Initial perception
├── 02.question_designer.md  # Step 2: Question list
├── 03.deep_researcher.md    # Step 3: Deep collection
├── 04.analyzer.md           # Analysis (described elsewhere by user)
├── 05.reporter.md           # Report (described elsewhere by user)
└── 10.quality_checker.md    # Quality check (independent process, use 10 series)
```

### Determining Whether to Split

**Signals that splitting into independent Agents is needed**:
- User clearly described multiple steps
- Steps have clear sequential dependencies
- Output of a step is input for the next step
- Output of a step has independent review value
- Step may need to be re-run independently

**Cases where splitting is not needed**:
- Step is very simple, can be completed with a few instructions
- Steps are tightly coupled and cannot exist independently
- Intermediate artifacts have no independent value

### Blueprint Naming Convention

```
{number}.{responsibility_description}.md

Examples:
01.initial_scanner.md      # Initial scanner
02.question_designer.md    # Question designer
03.deep_researcher.md      # Deep researcher
10.quality_checker.md      # Quality checker
```

Naming should reflect the Agent's business responsibility, not technical role.

## Examples

### Example 1: Single Agent Group (industry_assessment)

**User requirements**:
- Data collection in three phases: initial perception → question list → deep collection
- Quality check after collection
- Then analysis
- Finally generate report

**Agent structure** (single group, 00-09):
```
agents/
├── 00.orchestrator.md        # Orchestrator
├── 01.initial_scanner.md     # Phase 1: Industry overview + question list
├── 02.deep_researcher.md     # Phase 2: Deep research
├── 03.analyzer.md            # Phase 3: Analysis
├── 04.reporter.md            # Phase 4: Report generation
└── 05.quality_checker.md     # Phase 5: Quality check (part of the process)
```

### Example 2: Multiple Agent Groups (Assessment + Paper Writing)

**Scenario**:
- First group: Regional assessment, runs monthly, produces assessment reports
- Second group: Academic paper writing, runs on demand, writes papers based on assessment reports

**Agent structure** (two independent processes):
```
agents/
# First group: Regional assessment (00-09)
├── 00.orchestrator.md        # First group orchestrator
├── 01.data_collector.md      # Data collection
├── 02.indicator_analyzer.md  # Indicator analysis
├── 03.report_generator.md    # Report generation
│
# Second group: Paper writing (10-19)
├── 10.orchestrator.md        # Second group orchestrator
├── 11.paper_outliner.md      # Paper outline
├── 12.section_writer.md      # Section writing
└── 13.paper_integrator.md    # Paper integration
```

**Data transfer**:
```
workspace/
├── 03.reports/              # First group output: Assessment reports
│   └── assessment_202503.md
└── 13.paper/                # Second group output: Academic paper
    └── paper_draft.md       # Written based on assessment report
```

Two groups run independently:
- Run first group: `Please use agents/00.orchestrator.md to execute regional assessment`
- Run second group: `Please use agents/10.orchestrator.md to write academic paper`

### Anti-pattern: Overly Coarse-Grained Design

**Not recommended**:
```
agents/
├── 00.orchestrator.md
├── 01.data_collector.md    # Cram all three collection phases together
├── 02.analyzer.md
└── 03.reporter.md
```

**Problems**:
- data_collector has excessive responsibilities
- Intermediate artifacts from initial perception, question list, deep collection are invisible
- If one phase has problems, need to re-run the entire collection
- Difficult to understand and maintain

## Related Patterns

- **[Prompt-Defined Agent](./COR-01-prompt-defined-agent.md)**: Each Agent is defined by a Blueprint
- **[Orchestrated Agent Pipeline](./BHV-01-orchestrated-agent-pipeline.md)**: Execution order between Agents is orchestrated by Pipeline
- **[Filesystem Data Bus](./STR-02-filesystem-data-bus.md)**: Each Agent's output is stored in corresponding directory
- **[Progressive Data Refinement](./BHV-04-progressive-data-refinement.md)**: Data is progressively refined between Agents

## When Not to Use This Pattern

- **Extremely simple tasks**: Simple tasks requiring only one or two steps
- **Highly dynamic processes**: Process steps can only be determined at runtime
- **Tightly coupled steps**: Steps cannot be clearly separated
