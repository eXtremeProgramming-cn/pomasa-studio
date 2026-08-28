# Verifiable Data Lineage

**Category**: Quality
**Necessity**: Required

## Problem

How can we ensure that data and conclusions produced by AI systems are authentic and trustworthy?

AI systems (especially LLMs) suffer from a serious "hallucination" problem: they may fabricate non-existent data, invent URLs, or fake citations. Even when data verification is explicitly required in Blueprints, within the same execution context, AI often cannot effectively identify hallucinated data it produced earlier.

This problem is particularly serious in research-oriented MAS because:
- Final outputs require academic-level credibility
- Incorrect data leads to incorrect conclusions
- Once hallucinated data enters the analysis phase, it gets "whitewashed" into seemingly reasonable arguments

## Context

This pattern applies to the following scenarios:

- System outputs need to be verifiable and traceable
- High requirements for data authenticity
- Final outputs need to comply with academic standards
- Need to prevent AI hallucination issues

## Forces

- **Efficiency vs Rigor**: Strict verification increases time cost
- **Trust vs Verification**: Cannot blindly trust AI outputs; need independent verification
- **Completeness vs Credibility**: Better to have less data that is credible than more data that is questionable
- **Automation vs Human Intervention**: Some verification may require human participation

## Solution

**Establish end-to-end verifiable data lineage: all data must have verifiable sources, numbered and traced throughout, verified through independent contexts in layers, and unqualified data must be resolutely eliminated.**

### Core Principles

1. **Data Must Have Verifiable Sources**
   - Every piece of collected data must have a URL or academic citation
   - Sources must be externally accessible and verifiable
   - Do not accept vague sources like "widely known" or "reportedly"

2. **End-to-End Numbering and Tracing**
   - Original materials have unique numbers
   - Analysis materials cite original material numbers
   - Final report references point to verifiable sources

3. **Independent Context Verification**
   - Data verification must be executed by a separate subagent
   - Verification agent does not share context with collection agent
   - This is the only way to effectively identify hallucinated data

4. **Layered Verification Mechanism**
   - After collection: Fact-checking (does the data actually exist)
   - After analysis: Argument verification (do citations accurately support conclusions)

5. **Handling Unqualified Data**
   - Untrue data: Resolutely eliminate
   - Untrustworthy source data: Downgrade annotation or eliminate
   - Low credibility data: Clearly annotate

### Data Lineage Chain

```
External Source (URL/Academic Citation)
    │
    ▼
Original Material [ID: SRC-001]
    │ ← Post-collection verification: validate URL valid, content matches
    ▼
Analysis Material [ID: ANA-001, References: SRC-001, SRC-003]
    │ ← Post-analysis verification: validate citation accuracy, argument validity
    ▼
Final Report [References: URL list]
    │
    ▼
Externally Verifiable
```

## Consequences

### Benefits

- **Prevent Hallucination**: Independent verification can effectively identify fabricated data
- **Traceable**: Any conclusion can be traced back to original sources
- **Academic Credibility**: Outputs conform to academic citation standards
- **Quality Control**: Unqualified data is eliminated in time

### Liabilities

- **Reduced Efficiency**: Verification process adds time
- **Reduced Data Volume**: After eliminating unqualified data, available data becomes less
- **Increased Complexity**: Need to design numbering systems and verification processes
- **May Require Manual Work**: Some verification may require human intervention

## Implementation Guidelines

### Original Material Numbering Standard

```markdown
## [SRC-001] Data Title

**Source URL**: https://example.com/article/123
**Source Type**: Academic Article / Policy Document / Industry Report / News Article / ...
**Collection Time**: 2025-03-15
**Publication Time**: 2025-02-20

**Core Content**:
[Content summary]

**Key Quote from Original**:
> "Directly quoted original content"

**Credibility Assessment**: High / Medium / Low
**Credibility Explanation**: [Assessment rationale]
```

### Analysis Material Citation Standard

```markdown
## [ANA-001] Analysis Title

**Referenced Original Materials**:
- SRC-001: [Brief description of what was cited]
- SRC-003: [Brief description of what was cited]

**Analysis Content**:
According to data from [SRC-001]..., combined with reporting from [SRC-003]...

**Conclusion**:
[Analysis conclusion]
```

### Final Report Citation Standard

```markdown
## References

1. [SRC-001] Article Title, Author, Publication Date, URL
2. [SRC-003] Policy Name, Publishing Organization, Publication Date, URL
...
```

### Post-Collection Verification Agent Design

```markdown
# Data Verification Agent

## Your Role
You are an independent data verifier. Your task is to verify the authenticity and credibility of collected data.

## Important Principles
- You must independently verify each piece of data; cannot assume previous collection was correct
- For each URL, you must actually visit and confirm content matches
- Must truthfully record any issues found; cannot "go easy"

## Verification Content

### 1. Source Accessibility
- Visit each URL and confirm it can be accessed normally
- Record inaccessible URLs

### 2. Content Matching
- Confirm that content in URL matches the recorded summary in collection
- Confirm that cited original text actually exists in the source
- Mark data items with mismatched content

### 3. Source Credibility
- Evaluate source authority (official institutions > mainstream media > industry organizations > individuals)
- Mark low credibility sources

## Output

### Verification Report
```
# Data Verification Report

## Verification Overview
- Verification Time: [Time]
- Total Data Count: [Count]
- Passed Count: [Count]
- Issue Count: [Count]

## Issue List

### Inaccessible Sources
| ID | URL | Issue Description |
|------|-----|---------|
| SRC-005 | https://... | 404 Not Found |

### Content Mismatch
| ID | Issue Description |
|------|---------|
| SRC-012 | Claimed citation not found in original text |

### Low Credibility Sources
| ID | Source Type | Credibility | Recommendation |
|------|---------|--------|------|
| SRC-008 | Personal Blog | Low | Recommend elimination or downgrade |

## Verification Conclusion
[Overall assessment and recommendations]
```

### Handling Recommendations
- **Eliminate**: SRC-005, SRC-012 (untrue)
- **Downgrade Annotation**: SRC-008 (low credibility)
- **Retain**: Remaining data items
```

### Post-Analysis Verification Agent Design

```markdown
# Argument Verification Agent

## Your Role
You are an independent argument verifier. Your task is to verify whether citations in analysis materials are accurate and whether arguments are valid.

## Verification Content

### 1. Citation Accuracy
- Whether data cited in analysis matches original materials
- Whether there is cherry-picking
- Whether key information like numbers and dates is accurate

### 2. Argument Validity
- Whether cited evidence truly supports the conclusions drawn
- Whether there is over-inference
- Whether causal relationships are valid

### 3. Omission Check
- Whether important counter-evidence was ignored
- Whether conclusions are sufficiently cautious

## Output

### Argument Verification Report
- Citation accuracy issue list
- Argument validity issue list
- Modification recommendations
```

### Position in Pipeline

```
01.initial_scanner     → 02.deep_researcher
                              │
                              ▼
                       03.data_verifier    ← Post-collection verification (independent subagent)
                              │
                              ▼ (eliminate unqualified data)
                       04.analyzer
                              │
                              ▼
                       05.argument_verifier ← Post-analysis verification (independent subagent)
                              │
                              ▼ (correct issues)
                       06.reporter
```

## Examples

### Typical Characteristics of Hallucinated Data

**Situations prone to hallucination**:
- Specific numbers (e.g., "market size reached 1.2 trillion")
- Specific dates (e.g., "policy released in May 2023")
- Specific citations (e.g., "according to a certain research institute report")
- Content that looks reasonable but cannot be verified

**Warning signs during verification**:
- URL format is correct but page does not exist
- URL exists but content does not match description
- Source organization name has slight discrepancies (e.g., "China Automobile Association" vs "China Association of Automobile Manufacturers")
- Data "perfectly" supports conclusions too well

### Handling Issues Discovered During Verification

**Scenario**: Verification discovers that SRC-015's URL is inaccessible

**Handling Process**:
1. Try searching in internet archives (e.g., Wayback Machine)
2. Try searching for other sources with the same content
3. If alternative source found, update URL
4. If cannot verify, eliminate from dataset
5. Check whether analysis materials cited this data; if so, need to modify analysis

## Related Patterns

- **[Faithful Agent Instantiation](./BHV-02-faithful-agent-instantiation.md)**: Verification must be executed in independent subagent
- **[Business-Driven Agent Design](./STR-04-business-driven-agent-design.md)**: Verification Agent is an independent business step
- **[Embedded Quality Standards](./QUA-01-embedded-quality-standards.md)**: Quality standards include data authenticity requirements
- **[Layered Quality Assurance](./QUA-02-layered-quality-assurance.md)**: Layered verification is part of quality assurance

## Checklist

When designing the system, confirm the following points:

- [ ] All collected data has URL or academic citation?
- [ ] Original materials have unified numbering standard?
- [ ] Analysis materials use numbering when citing original materials?
- [ ] Final report has complete References?
- [ ] Independent data verification Agent exists after collection?
- [ ] Verification Agent executes in independent subagent context?
- [ ] Clear process for handling unqualified data exists?
- [ ] Argument verification mechanism exists after analysis?
