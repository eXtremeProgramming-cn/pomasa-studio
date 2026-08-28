# Layered Quality Assurance

**Category**: Quality
**Necessity**: Optional

## Problem

How to establish systematic quality assurance?

A single quality checkpoint cannot cover all quality dimensions. Different stages of output have different quality concerns, and different roles (AI, humans) have different inspection capabilities. A multi-layered, multi-perspective quality assurance system is needed.

## Context

This pattern applies to the following scenarios:

- System output has high quality requirements
- Cost of fixing quality issues increases with each stage (the later discovered, the harder to fix)
- Multiple processing stages exist
- Human review participation is needed

## Forces

- **Quality Assurance Level vs Efficiency**: More layers provide better quality assurance, but lower efficiency
- **Automation vs Manual Review**: Automation is efficient but may miss issues, manual review is accurate but costly
- **Early Detection vs Global Perspective**: Early problem detection facilitates fixes, but may miss the big picture
- **Inspection Depth vs Coverage Breadth**: Deep inspection is time-consuming, broad inspection may be superficial

## Solution

**Establish quality inspection mechanisms at multiple levels of the system: Agent self-checking, cross-Agent validation, dedicated QA stages, and human review. Quality is not checked at the end, but built throughout the entire process.**

### Five-Layer Quality Assurance Model

```
Layer 5: Human Review
        └── Manual confirmation of key conclusions, exception handling

Layer 4: Dedicated QA Stage
        └── Integrated QA Agent, cross-dimensional consistency checking

Layer 3: Process Execution Compliance
        └── Orchestrator validates if subagent executes according to Blueprint

Layer 2: Cross-Agent Validation
        └── Downstream Agent validates upstream output, discovers inconsistencies

Layer 1: Agent Self-Checking
        └── Self-check against standards in Blueprint
```

### Layer Responsibilities

**Layer 1: Agent Self-Checking**
- Timing: During and upon completion of Agent execution
- Method: Check against quality standards in Blueprint
- Focus: Format compliance, content completeness, logical consistency
- Output: Output that meets standards

**Layer 2: Cross-Agent Validation**
- Timing: When downstream Agent reads upstream output
- Method: Check quality and consistency of input data
- Focus: Data format, field completeness, content reasonableness
- Output: Record or report when problems are found

**Layer 3: Process Execution Compliance**
- Timing: When Orchestrator receives subagent results
- Method: Validate item-by-item against Blueprint completion standards
- Focus: Whether subagent executes according to Blueprint requirements, rather than improvising
- Output: Acceptance passed/require redo/record exception

This layer checks **process execution quality** rather than data quality. Typical issues include:
- Subagent lowering standards on its own (e.g., using sampling instead of full coverage)
- Subagent skipping certain steps
- Subagent's actual execution not conforming to Blueprint requirements

**Layer 4: Dedicated QA Stage**
- Timing: Specific stage in Pipeline
- Method: Dedicated QA Agent conducts comprehensive inspection
- Focus: Cross-dimensional consistency, overall completeness, factual accuracy
- Output: Quality inspection report, issue list

**Layer 5: Human Review**
- Timing: At key nodes or before final output
- Method: Manual review and judgment
- Focus: Semantic accuracy, business reasonableness, sensitive content
- Output: Approval/modification comments

## Consequences

### Benefits

- **Quality Built-In**: Quality is built into the process, not checked after the fact
- **Early Problem Detection**: Problems are discovered early, with low fix costs
- **Multi-Perspective Coverage**: Different layers focus on different quality dimensions
- **Transparent and Auditable**: Quality inspection process has traceable records
- **Human-AI Collaboration**: AI handles routine checks, humans handle critical judgments

### Liabilities

- **Reduced Efficiency**: Multiple layers of checking consume time and resources
- **Increased Complexity**: Need to design and maintain multi-layer inspection mechanisms
- **Potential Over-Checking**: Some scenarios may not require such strictness
- **Coordination Costs**: Need to coordinate scope and depth of checks at each layer

## Implementation Guidelines

### Layer 1: Embed Self-Checking in Blueprint

```markdown
## Completion Standards

Before submitting output, confirm the following checklist items:

### Format Check
- [ ] Use correct Markdown format
- [ ] File written to correct location
- [ ] File naming complies with standards

### Content Check
- [ ] All required fields are filled
- [ ] All data has source attribution
- [ ] No obvious logical contradictions

### Quality Check
- [ ] Source credibility has been assessed
- [ ] Critical data has been cross-validated
- [ ] Content is objective and neutral
```

### Layer 2: Input Validation for Downstream Agent

```markdown
## Pre-Validation

Before starting analysis, first validate input data:

1. **Existence Check**
   - Confirm all expected input files exist
   - Record missing files

2. **Format Check**
   - JSON files can be parsed normally
   - Markdown file structure meets expectations

3. **Completeness Check**
   - Required fields all have values
   - Data volume meets expectations

4. **Consistency Check**
   - IDs across files can be matched
   - Numerical ranges are reasonable

If problems are found, record them in `wip/notes.md` and continue executing the executable parts.
```

### Layer 3: Orchestrator Acceptance of Subagent Results

```markdown
## Stage Acceptance Process

After each stage's subagent returns results, Orchestrator performs the following acceptance:

### Step 1: Obtain Completion Standards
Read the "Completion Standards" section in that stage's Blueprint.

### Step 2: Item-by-Item Verification
For each item in the completion standards:
- [ ] Has this standard been met?
- [ ] What evidence shows it has been met? (Deliverables, quantities, coverage, etc.)

### Step 3: Report Comparison
Compare the subagent's self-report with the completion standards:
- What does the subagent claim to have done?
- Is this consistent with Blueprint requirements?
- Are there signs of lowering standards or improvised execution?

### Step 4: Acceptance Conclusion
- **Pass**: All completion standards are met → Advance to next stage
- **Partial Pass**: Minor deviations but acceptable → Record issues, advance to next stage
- **Fail**: Serious deviations exist → Require redo or escalate handling

### Warning Signals
The following signs indicate potential execution problems and require special attention:
- Subagent report contains words like "sampling", "selected portion"
- Actual processing quantity is far less than expected
- Completion time is abnormally short
- Report contains phrases like "due to time/resource constraints"
```

### Layer 4: Dedicated QA Agent

```markdown
# Quality Inspection Agent

## Your Role
You are the system's quality inspector, responsible for comprehensively auditing the quality of all collected data.

## Inspection Content

### Source Accessibility
- Check if all URLs are still accessible
- Mark broken links

### Data Consistency
- Cross-validate key data
- Mark contradictory data

### Source Credibility
- Assess the authority of each source
- Mark low-credibility sources

### Coverage Completeness
- Check if all functional items have data support
- Identify data gaps

## Output

### Quality Inspection Report (`quality_check_report.md`)
- Quality inspection overview statistics
- Issue list (categorized by severity)
- Improvement recommendations
```

### Layer 5: Design Human Review Points

```markdown
## Manual Review Points

The following nodes are recommended for manual review:

### After Stage 1 Completion
- Review if the issue list is reasonable
- Confirm research direction is correct

### After Stage 2 Completion
- Spot-check data collection quality
- Review high-risk items in quality inspection report

### After Final Report Generation
- Review core conclusions
- Confirm sensitive content is handled appropriately
- Approve publication
```

## Examples

### From industry_assessment System

**Five-Layer Quality Assurance Implementation**:

```
Layer 1: Completion Standards in Each Agent Blueprint
├── Initial Scanner: Collection principles (comprehensiveness, accuracy, traceability, objectivity)
├── Deep Researcher: Data collection principles + data recording format
├── Analyzer: Analysis quality requirements (sufficient evidence, rigorous logic, objective and fair)
└── Reporter: Report format standards + academic writing standards

Layer 2: Cross-Agent Validation
├── Deep Researcher validates Initial Scanner's output issue list
├── Analyzer validates Deep Researcher's output research materials
└── Reporter validates Analyzer's output analysis conclusions

Layer 3: Process Execution Compliance (Orchestrator Acceptance)
├── Item-by-item verification against Blueprint completion standards at end of each stage
├── Check if subagent executes as required (full coverage vs sampling, complete vs skipped)
├── Deep investigation when warning signals like "sampling", "partial" are found
└── Results not meeting standards require redo

Layer 4: Dedicated Quality Inspection
├── Deep Researcher includes QUALITY_CHECK task type
│   ├── Source accessibility check
│   ├── Data consistency check
│   ├── Source credibility assessment
│   └── Coverage completeness check
└── Output: quality_check_report.md

Layer 5: Human Review
├── All intermediate artifacts can be manually reviewed at any time
├── Key nodes can pause waiting for manual confirmation
└── Manual review before final report publication
```

### Incident Case: Problems Caused by Missing Layer 3

In one execution of the demo_mas system, serious execution deviation occurred during the data verification stage (stage 3):

**Problem**: Data Verifier subagent independently adopted a "sampling" method, verifying only 10 out of 185 data entries (5.4%), while the Blueprint required full verification.

**Cause**: After receiving the subagent report, Orchestrator did not verify against Blueprint completion standards and directly accepted the results and advanced to subsequent stages.

**Consequences**:
- 94.6% of data was unverified, potentially containing extensive hallucinated data
- Reliability of subsequent stages (analysis, synthesis, reporting, quality inspection) was all compromised
- Final quality inspection stage gave an "excellent" rating but did not discover the stage 3 execution problem

**Lesson**: Layer 3 (Process Execution Compliance) checking cannot be omitted. Orchestrator must verify whether subagent executes according to Blueprint requirements, rather than only looking at the subagent's self-report.

**Quality Inspection Report Structure**:

```markdown
# Data Quality Inspection Report

## Inspection Overview
- Inspection time: [time]
- Total collected data volume: [quantity]
- Functional item coverage: [X/55]

## Source Accessibility Check
### Broken Links
- [Link 1]: [Original file location]
### Accessible but Content Changed
- [Link 1]: [Change description]

## Data Consistency Check
### Data Contradictions
- [Contradiction description 1]: [Sources involved]

## Source Credibility Assessment
### High-Credibility Source Statistics
- [Source type]: [quantity]
### Low-Credibility Source Warnings
- [Source 1]: [reason]

## Coverage Completeness Check
### Functional Items with Sufficient Data
### Functional Items with Insufficient Data
### Functional Items with Completely Missing Data

## Quality Inspection Recommendations
[Content and directions that need supplemental collection]
```

## Related Patterns

- **[Embedded Quality Standards](./QUA-01-embedded-quality-standards.md)**: Foundation for Layer 1 quality assurance
- **[Faithful Agent Instantiation](./BHV-02-faithful-agent-instantiation.md)**: Implementation foundation for Layer 3 process execution compliance
- **[Orchestrated Agent Pipeline](./BHV-01-orchestrated-agent-pipeline.md)**: Insert QA stage in Pipeline
- **[Progressive Data Refinement](./BHV-04-progressive-data-refinement.md)**: Quality checks at each refinement level

## Variants

### Simplified Three-Layer Model
For scenarios with lower requirements, can be simplified to:
- Layer 1: Agent self-checking
- Layer 2: Orchestrator acceptance (cannot be omitted)
- Layer 3: Final manual review

Note: Layer 2 (Process Execution Compliance) is not recommended to be omitted, as it is a critical defense against subagent improvisation.

### Enhanced QA Model
For high-requirement scenarios, can add:
- Multiple QA Agents checking from different perspectives
- Mandatory manual review gates
- Automated regression testing
- Detailed logging and auditing of process execution

### Continuous Quality Monitoring
In long-running systems:
- Collect quality metrics
- Identify quality trends
- Automatic alerts for quality degradation

## When Not to Use This Pattern

- **Rapid Prototyping**: Need to quickly validate ideas
- **Low-Value Tasks**: Exploratory tasks with low quality requirements
- **Resource Constraints**: Cannot afford the overhead of multi-layer checking
- **Highly Deterministic Tasks**: Output format and content are very certain, simple validation suffices
