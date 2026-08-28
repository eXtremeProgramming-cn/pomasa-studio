# Progressive Data Refinement

**Category**: Behavior
**Necessity**: Optional

## Problem

How to handle complex data transformation requirements?

From raw input to final output, data needs to undergo multiple transformations. A single-step transformation is difficult to ensure quality and hard to debug and audit. A method is needed to organize progressive data processing while preserving intermediate artifacts at each stage.

## Context

This pattern applies to scenarios where:

- Data needs multiple transformations to reach its final form
- Each transformation has independent value (can be reviewed, can be reused)
- The evolution process of data needs to be traceable
- Quality needs to be checked step-by-step during the transformation process

## Forces

- **Transformation Quality vs Efficiency**: Step-by-step transformation has higher quality, but may be less efficient
- **Intermediate Artifact Value vs Storage Cost**: Preserving intermediate artifacts has value, but consumes storage
- **Traceability vs Simplicity**: Complete traceability has value, but increases complexity
- **Flexibility vs Coupling**: Independent stages are easier to adjust, but require defining interfaces

## Solution

**Data undergoes multiple refinement levels in the system, with each level transforming data into a state closer to the final form. The output of each level is persisted, forming complete data lineage.**

### Refinement Level Model

```
Raw Input
    │
    ▼ Level 1: Structuring
Unstructured Content → Structured Data
    │
    ▼ Level 2: Analysis
Structured Data → Analysis Results
    │
    ▼ Level 3: Integration
Analysis Results → Synthesized Insights
    │
    ▼ Level 4: Narrativization
Synthesized Insights → Final Report
```

### Core Characteristics

1. **Unidirectional Data Flow**:
   - Data only flows forward
   - Each stage produces new data without modifying previous data
   - Forms complete data lineage

2. **Data Immutability**:
   - Once produced, data is not modified
   - Facilitates tracing and reproduction
   - Supports concurrent access

3. **Independent Transformation Logic**:
   - Each refinement level has an independent Agent
   - Input and output formats are clearly defined
   - Can be independently tested and optimized

## Consequences

### Benefits

- **Quality Control**: Each layer's transformation can be independently quality-checked
- **Complete Traceability**: Any data can be traced back to its source
- **Rerun Support**: Can restart from any level
- **Ease of Debugging**: Can inspect outputs at each layer when errors occur
- **Reusable Intermediate Artifacts**: Outputs from certain levels can be used for other purposes

### Liabilities

- **Storage Overhead**: Need to save intermediate artifacts at each layer
- **Increased Processing Time**: Multi-layer transformation takes longer than single-step transformation
- **Format Conversion Cost**: May need format adaptation between layers
- **Design Complexity**: Need to define responsibilities and interfaces for each layer

## Implementation Guidelines

### Defining Refinement Levels

```
Level 1: Data Collection
├── Input: External data sources
├── Output: Structured raw data
├── Responsibility: Fetch, clean, structure
└── Directory: workspace/01.materials/

Level 2: Analysis Processing
├── Input: Structured raw data
├── Output: Analysis conclusions
├── Responsibility: Analyze, reason, evaluate
└── Directory: workspace/02.analysis/

Level 3: Report Generation
├── Input: Analysis conclusions
├── Output: Final report
├── Responsibility: Integrate, narrate, format
└── Directory: workspace/03.reports/
```

### Directory Structure Reflects Refinement Levels

```
workspace/
├── 01.materials/          # Level 1: Raw Materials
│   ├── raw/               # Structured raw data
│   └── sources/           # Source information
│
├── 02.analysis/           # Level 2: Analysis Results
│   ├── by_entity/         # Analysis by entity
│   └── synthesis/         # Synthesized analysis
│
└── 03.reports/            # Level 3: Final Reports
    ├── main_report.md
    └── appendices/
```

### Data Format Transformation

```
Level 1 → Level 2:
JSON Data → Analysis Markdown
{                         # Analysis: {ENTITY}
  "entity": "...",
  "data": [...]           ## Key Findings
}                         - Finding 1
                          - Finding 2

                          ## Data Support
                          Referenced from 01.materials/...

Level 2 → Level 3:
Analysis Markdown → Report Markdown
# Analysis: {ENTITY}     # Comprehensive Report
## Key Findings
...                       ## Chapter 1
                          Integrating analysis from multiple entities...
```

### Maintaining Data Lineage

```markdown
## Data Sources

This analysis is based on the following raw data:
- `01.materials/entity_a/data.json` (collected on 2025-03-15)
- `01.materials/entity_b/data.json` (collected on 2025-03-15)

## Reference Notes

- [1] Original from 01.materials/entity_a/sources.md#source-1
- [2] Original from 01.materials/entity_b/sources.md#source-3
```

## Examples

### From the industry_assessment System

**Four-Layer Refinement Model**:

```
Level 1: Initial Perception
├── Input: Public web information
├── Output:
│   ├── 01.industry_overview/ (Industry overview)
│   └── 02.question_list/ (Question list)
├── Transformation: Unstructured web pages → Structured overview + Question list
└── Agent: Initial Scanner

Level 2: Deep Research
├── Input: Question list + Public web information
├── Output: 03.deep_research/ (Detailed materials for 55 functional items)
├── Transformation: Question-driven information collection → Categorized evidence materials
└── Agent: Deep Researcher

Level 3: Analysis and Synthesis
├── Input: Deep research materials
├── Output:
│   ├── 02.analysis/functions/ (Functional item analysis)
│   ├── 02.analysis/features/ (Feature synthesis)
│   ├── 02.analysis/dimensions/ (Dimension synthesis)
│   └── 02.analysis/overall_synthesis.md (Overall synthesis)
├── Transformation: Evidence materials → Layered analysis conclusions
└── Agent: Analyzer

Level 4: Report Generation
├── Input: Analysis and synthesis results
├── Output: 03.reports/final_report.md
├── Transformation: Analysis conclusions → Academic report
└── Agent: Reporter
```

**Data Lineage Example**:

```
A conclusion in the final report:
"The degree of public ownership dominance in the new energy vehicle industry is 'Strong'"

Data lineage trace:
└── 03.reports/final_report.md
    └── Referenced from 02.analysis/dimensions/dimension_1.md
        └── Synthesized from 02.analysis/features/feature_1.md
            └── Based on 02.analysis/functions/1.1_control_strategic_sectors.md
                └── Analyzed from 01.materials/03.deep_research/1.1_control_strategic_sectors/
                    ├── policies.md (Policy evidence)
                    ├── statistics.md (Statistical evidence)
                    └── cases.md (Case evidence)
                        └── Original source: [URL] (collected on 2025-03-15)
```

## Related Patterns

- **[Orchestrated Agent Pipeline](./BHV-01-orchestrated-agent-pipeline.md)**: Each stage of the Pipeline implements data refinement
- **[Filesystem Data Bus](./STR-02-filesystem-data-bus.md)**: Refinement levels are reflected in directory structure
- **[Layered Quality Assurance](./QUA-02-layered-quality-assurance.md)**: Each refinement level has quality checks

## Variants

### Branched Refinement
Data at the same level may produce multiple different downstream artifacts:
```
Analysis Results
├── → Executive Summary (for management)
├── → Detailed Report (for researchers)
└── → Data Appendix (for validators)
```

### Iterative Refinement
Certain levels may require multiple iterations:
```
Draft → Review Feedback → Revision → Re-review → Final Version
```

### Incremental Refinement
When new data arrives, incrementally update rather than complete rerun:
```
Existing Data + New Data → Incremental Analysis → Merge into Existing Analysis
```

## When Not to Use This Pattern

- **Simple Transformation**: Can be completed in a single step
- **Real-time Systems**: Cannot accept the latency of multi-layer processing
- **Storage Constraints**: Cannot save large amounts of intermediate artifacts
- **No Need for Traceability**: Final results are sufficient, process doesn't matter
