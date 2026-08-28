# Orchestrated Agent Pipeline

**Category**: Behavior
**Necessity**: Recommended

## Problem

How to organize multiple Agents to collaborate on complex tasks?

A single Agent can complete specific tasks, but end-to-end complex tasks often require multiple steps of different natures. Having one Agent perform all the work leads to:
- Excessive cognitive load, making quality difficult to guarantee
- Errors that may propagate to all subsequent steps
- Inability to parallelize, resulting in low efficiency
- Invisible intermediate artifacts, making debugging and auditing difficult

## Context

This pattern applies to scenarios where:

- Tasks can be naturally decomposed into multiple stages
- Each stage has clearly different responsibilities
- Data dependencies exist between stages
- Intermediate artifacts need to be preserved and reviewed
- Some stages can be parallelized

## Forces

- **Specialization vs Generalization**: Specialized Agents produce better results but increase coordination complexity
- **Decoupling vs Tight Collaboration**: Decoupling facilitates independent evolution but may increase communication overhead
- **Sequential vs Parallel Execution**: Sequential execution is simple and reliable, parallel execution improves efficiency
- **Intermediate Artifacts vs End-to-End Efficiency**: Preserving intermediate artifacts facilitates auditing but increases storage requirements

## Solution

**Decompose tasks into multiple sequentially executed stages, with each stage handled by a specialized Agent type, coordinated by an Orchestrator Agent. Data is progressively refined between stages.**

### Pipeline Structure

```
Orchestrator
     │
     ├── Stage 1: Data Collection
     │   ├── Agent Instance 1 ──┐
     │   ├── Agent Instance 2 ──┼── Parallel Execution
     │   └── Agent Instance N ──┘
     │         │
     │         ▼
     │   [Stage 1 Output]
     │
     ├── Stage 2: Analysis
     │   ├── Agent Instance 1 ──┐
     │   └── Agent Instance M ──┘
     │         │
     │         ▼
     │   [Stage 2 Output]
     │
     └── Stage 3: Report Generation
         └── Agent Instance 1
               │
               ▼
         [Final Output]
```

### Core Mechanisms

1. **Orchestrator Responsibilities**:
   - Read and understand the overall task
   - Determine execution order and parallelization opportunities
   - Launch Agents for each stage
   - Pass parameters and context
   - Monitor execution status
   - Handle exceptions

2. **Inter-Stage Synchronization**:
   - Use barrier synchronization: wait for all Agents to complete before entering next stage
   - Detect completion status through filesystem

3. **Data Passing**:
   - Output directory of Stage N = Input directory of Stage N+1
   - Through directory conventions rather than explicit passing

## Consequences

### Benefits

- **Clear Responsibilities**: Each Agent focuses on a single type of task
- **Parallel Capability**: Independent tasks can execute in parallel
- **Valuable Intermediate Artifacts**: Can be reviewed, reused, manually corrected
- **Good Fault Tolerance**: Failure of one stage doesn't affect outputs of previous stages
- **Observability**: Progress of each stage can be monitored
- **Supports Incremental Development**: Can develop and test stage by stage

### Liabilities

- **Coordination Overhead**: Requires Orchestrator coordination
- **Data Transformation Cost**: May require data format conversion between stages
- **Increased Overall Latency**: Synchronization waiting between stages
- **Intermediate Storage Requirements**: Need to store outputs of each stage
- **Limited Flexibility**: Unidirectional data flow, doesn't support feedback loops

## Implementation Guidelines

### Orchestrator Blueprint Structure

```markdown
# Orchestrator

## Your Role
You are the main coordinator of the system, responsible for orchestrating the entire research process.

## Execution Flow

### Stage Zero: Initialization
1. Verify integrity of reference files
2. Create directory structure for this execution
3. Record execution start time

### Stage One: Data Collection
**Goal**: Collect raw data
**Execution Method**:
- Read `agents/01.data_collector.md`
- Launch one Agent Instance for each data source
- Can execute in parallel
- Wait for all Instances to complete
**Completion Indicator**: Complete output in `workspace/01.materials/` directory

### Stage Two: Analysis
**Goal**: Analyze raw data
**Precondition**: Stage One completed
**Execution Method**:
- Read `agents/02.analyzer.md`
- Launch Agent Instances according to analysis tasks
- Wait for all Instances to complete
**Completion Indicator**: Complete output in `workspace/02.analysis/` directory

### Stage Three: Report Generation
**Goal**: Generate final report
**Precondition**: Stage Two completed
**Execution Method**:
- Read `agents/03.reporter.md`
- Launch single Reporter Agent
**Completion Indicator**: `workspace/03.reports/final_report.md` exists

### Stage Four: Quality Check (Optional)
...

## Exception Handling
- If a stage fails, record error information to `wip/notes.md`
- Attempt to provide partial results
- Notify user of failure and completed portions
```

### Stage Division Principles

1. **Divide by Task Nature**:
   - Collection, analysis, generation are fundamentally different tasks
   - Each type of task requires different capabilities and strategies

2. **Divide by Dependencies**:
   - Subsequent stages depend on outputs of previous stages
   - Tasks within the same stage are independent of each other

3. **Divide by Parallelization Opportunities**:
   - Tasks that can be parallelized are placed in the same stage
   - Tasks that must be sequential are placed in different stages

### Three-Stage Reference Model

```
Stage 1: Data Collection
├── Retrieve data from external sources
├── Unstructured → Structured
└── Output: Raw structured data

Stage 2: Analysis
├── Analyze, classify, extract data
├── Structured data → Analysis results
└── Output: Analysis products

Stage 3: Report Generation
├── Integrate analysis results, generate report
├── Analysis results → Narrative document
└── Output: Final deliverable
```

### Optional Fourth Stage

```
Stage 4: Quality Assurance
├── Review report quality
├── Perform consistency checks
├── Generate quality check report
└── Flag issues requiring human attention
```

## Examples

### From the industry_assessment System

**Four-Stage Pipeline**:

```
Stage 1: Initial Scanner
├── Collect industry overview
├── Formulate question list
└── Output: 01.materials/01.industry_overview/
         01.materials/02.question_list/

Stage 2: Deep Researcher
├── Collect materials for 55 functional items
├── Execute data quality check
└── Output: 01.materials/03.deep_research/
         01.materials/quality_check_report.md

Stage 3: Analyzer
├── Functional item analysis
├── Feature→Dimension→Overall synthesis
└── Output: 02.analysis/functions/
         02.analysis/features/
         02.analysis/dimensions/
         02.analysis/overall_synthesis.md

Stage 4: Reporter
├── Generate academic paper format report
└── Output: 03.reports/final_report.md
         03.reports/executive_summary.md
```

**Orchestrator Coordination Logic (Conceptual)**:

```markdown
## Execution Flow

1. Verify integrity of reference files in references/ directory
2. Create workspace/{INDUSTRY_ID}/ directory structure

3. Launch Stage 1:
   - Use 01.initial_scanner.md to launch Initial Scanner
   - Pass parameters: {INDUSTRY_ID}, {INDUSTRY_NAME}
   - Wait for completion

4. Launch Stage 2:
   - Read question list, determine 55 functional items
   - Launch one Deep Researcher instance for each functional item (can parallel)
   - Wait for all instances to complete
   - Execute data quality check

5. Launch Stage 3:
   - Launch Analyzer for each functional item (can parallel)
   - Execute feature-level synthesis
   - Execute dimension-level synthesis
   - Execute overall synthesis

6. Launch Stage 4:
   - Launch Reporter to generate final report

7. Complete: Deliver report to user
```

## Related Patterns

- **[Prompt-Defined Agent](./COR-01-prompt-defined-agent.md)**: Each Agent in the pipeline is defined by a Blueprint
- **[Filesystem Data Bus](./STR-02-filesystem-data-bus.md)**: Data is passed between stages through filesystem
- **[Parallel Instance Execution](./BHV-03-parallel-instance-execution.md)**: Multiple Instances can execute in parallel within a stage
- **[Progressive Data Refinement](./BHV-04-progressive-data-refinement.md)**: Data is progressively refined between stages

## Variants

### Conditional Branch Pipeline
Some stages execute or branch based on conditions.

### Iterative Pipeline
Some stages may need to execute iteratively until conditions are met.

### Hybrid Pipeline
Some stages are sequential, some parallel, forming a complex execution graph.

## When Not to Use This Pattern

- **Simple Tasks**: Tasks that can be completed by a single Agent
- **Real-Time Interactive Systems**: Systems requiring immediate response
- **Complex Feedback Loops Needed**: Subsequent stages need to modify outputs of previous stages
- **Highly Dynamic Tasks**: Execution path is highly uncertain
