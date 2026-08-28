# Faithful Agent Instantiation

**Category**: Behavior
**Necessity**: Required

## Problem

How do you ensure Agents are correctly instantiated and executed?

In multi-agent systems, an Orchestrator needs to invoke other Agents to execute tasks. Common erroneous practices include:

1. **Summarized Paraphrasing**: The Orchestrator reads Agent B's Blueprint and then creates its own "summarized version" to launch the subagent. This leads to loss of critical details and execution deviations.

2. **Task Batching**: During batch execution, multiple tasks that should be independent are packaged into a single subagent invocation. This prevents each task from receiving the execution quality it deserves.

These practices may cause minor issues in short call chains, but lead to severe quality degradation in long call chains or high-volume batch tasks.

## Context

This pattern applies to the following scenarios:

- An Orchestrator needs to invoke other Agents
- Long call chains exist (A invokes B, B invokes C...)
- Batch execution of similar tasks is required
- High execution quality standards are required

## Forces

- **Efficiency vs Quality**: Summarized paraphrasing or task batching may seem more "efficient", but quality degrades
- **Conciseness vs Completeness**: Concise invocation methods may omit critical information
- **Flexibility vs Standardization**: Flexible invocation methods make it difficult to ensure consistency

## Solution

**Each Agent instance must directly read and execute the complete Blueprint. The caller only passes parameters, not Blueprint content. Each independent task corresponds to an independent subagent invocation. The Orchestrator must verify that results comply with Blueprint completion criteria when receiving them.**

### Core Principles

1. **Caller Only Passes Parameters, Never Paraphrases Blueprint**
   - Orchestrator tells the subagent which Blueprint file to read
   - Subagent reads and executes the complete Blueprint itself
   - Caller does not summarize, simplify, or paraphrase

2. **One Task Instance = One Subagent Invocation**
   - In batch tasks, each independent task launches a separate subagent
   - Each subagent receives its own parameters
   - Do not package multiple tasks into one invocation

3. **Blueprint is the Sole Basis for Execution**
   - Subagent behavior is entirely determined by the Blueprint
   - Does not rely on caller's "interpretation" or "guidance"

4. **Orchestrator Must Verify Results**
   - When receiving results from a subagent, verify against Blueprint completion criteria item by item
   - Results that do not meet completion criteria must not be accepted; must require rework or report exceptions
   - Cannot consider a task complete based solely on subagent's self-report

5. **Completion Criteria are Non-Negotiable**
   - Completion criteria in the Blueprint are hard requirements; subagent must not lower them on its own
   - When encountering difficulties, must consult the Orchestrator; the Orchestrator decides whether to adjust
   - "Trial runs" can only reduce task scope, not lower quality standards

## Consequences

### Benefits

- **Execution Stays True**: Each step in long call chains executes the complete specification
- **Consistent Batch Task Quality**: Each task receives equal execution quality
- **Predictability**: Knowing the Blueprint enables prediction of execution results
- **Easy Debugging**: Problems can be traced to specific Blueprints

### Liabilities

- **Increased Invocation Overhead**: Each task invoked separately, increasing call count
- **May Seem "Verbose"**: Cannot "cleverly" optimize through packaging
- **Depends on Blueprint Completeness**: Blueprint itself must be sufficiently complete

## Implementation Guidelines

### Correct Invocation Method

**Invoking Other Agents in Orchestrator**:

```markdown
## Stage Two: Deep Research

For each function item, launch an independent Deep Researcher:

For each function item {FUNCTION_ID}:
1. Launch a new subagent
2. Instruct the subagent:
   - Read `agents/02.deep_researcher.md`
   - Execute strictly according to the Blueprint
   - Parameters: INDUSTRY_ID={current industry}, FUNCTION_ID={current function item}
3. Wait for subagent to complete

Note:
- Each function item launches an independent subagent
- Do not package multiple function items into one subagent
- Do not summarize or paraphrase Blueprint content
```

**Standard Wording for Invocation**:

```
Please launch a subagent to execute the following task:
1. Read agents/02.deep_researcher.md
2. Execute strictly according to that Blueprint
3. Parameters:
   - INDUSTRY_ID: xxx
   - FUNCTION_ID: xxx
```

### Incorrect Invocation Methods

**Anti-pattern 1: Summarized Paraphrasing**

```markdown
❌ Incorrect:
Launch subagent to execute deep research task:
- Search for policy documents about this function item
- Search for related statistical data
- Organize into markdown format
(This is the Orchestrator's own summary, not the complete Blueprint)
```

**Anti-pattern 2: Task Batching**

```markdown
❌ Incorrect:
Launch one subagent to complete research for the following 5 function items:
- Function item 1.1
- Function item 1.2
- Function item 1.3
- Function item 1.4
- Function item 1.5
(Should launch independent subagent for each function item)
```

### Correct Handling of Batch Tasks

**Serial Execution**:
```markdown
For each function item in sequence:
1. Launch subagent, read and execute agents/02.deep_researcher.md
2. Wait for completion
3. Process next function item
```

**Parallel Execution**:
```markdown
Launch subagents for all function items simultaneously:
- subagent 1: Execute agents/02.deep_researcher.md, parameter FUNCTION_ID=1.1
- subagent 2: Execute agents/02.deep_researcher.md, parameter FUNCTION_ID=1.2
- subagent 3: Execute agents/02.deep_researcher.md, parameter FUNCTION_ID=1.3
...
Wait for all subagents to complete
```

### Emphasizing This Requirement in Blueprint

**Orchestrator Blueprint Should Include Explicit Instructions**:

```markdown
## Important: Agent Invocation Standards

When invoking other Agents, must follow these standards:

1. **Do Not Summarize or Paraphrase Blueprint**
   - Let the invoked subagent read the complete Blueprint file itself
   - You only pass parameters, not Blueprint content

2. **Each Independent Task Launches Independent Subagent**
   - For batch tasks, each task launches a separate subagent
   - Do not package multiple tasks into one subagent invocation

3. **Standard Invocation Method**
   When launching subagent, use the following format:
   "Please read agents/XX.xxx.md and execute strictly according to that Blueprint, parameters:..."

4. **Verify Subagent Results**
   - After receiving results, verify against Blueprint completion criteria item by item
   - Results that do not meet criteria must require rework
   - Cannot consider complete based solely on subagent's self-report

5. **Boundary Constraints**
   - Explicitly state in invocation instruction: "completion criteria cannot be lowered"
   - Explicitly state: "if encountering difficulties, consult; do not make adjustments on your own"
```

### Orchestrator Verification Mechanism Example

```markdown
## Stage Verification Process

After each stage's subagent returns results, execute the following verification:

1. **Read that stage's Blueprint completion criteria**
2. **Check item by item against criteria**:
   - Have all items in the completion criteria been satisfied?
   - Does the work reported by the subagent match the completion criteria?
   - Do the deliverables exist and have correct format?
3. **Verification Conclusion**:
   - All satisfied → Mark stage complete, proceed to next stage
   - Partially unsatisfied → Require subagent to complete the gaps
   - Seriously deviated → Record issue, decide whether to redo

**Important**: Cannot skip verification and proceed directly. Better to spend more time on verification than to let unqualified results pass.
```

### Boundary Constraint Example

When invoking a subagent, explicitly communicate boundary constraints:

```markdown
Please launch a subagent to execute the following task:
1. Read agents/03.data_verifier.md
2. Execute strictly according to that Blueprint
3. Parameters: INDUSTRY_ID=nev

**Important Constraints**:
- Completion criteria in the Blueprint are hard requirements, must be 100% satisfied
- Must not lower standards for "trial run" or any other reason
- If encountering time or technical difficulties preventing completion, report immediately, I will decide how to handle
- Must not adopt sampling, simplification, or other workaround methods on your own
```

## Examples

### Correct Example: Orchestrator Invoking Deep Researcher

```markdown
## Stage Two Execution

### 2.1 Preparation
Read `workspace/{INDUSTRY_ID}/01.materials/02.question_list/` to obtain complete function item list.

### 2.2 Launch Deep Research
For each function item in the question list, launch independent research task:

**Invocation Method** (repeat for each function item):

Launch a subagent with the following instructions:
> Please read `agents/02.deep_researcher.md` and execute strictly according to that Blueprint.
>
> Parameters:
> - INDUSTRY_ID: {current industry ID}
> - FUNCTION_ID: {current function item number}
> - FUNCTION_NAME: {current function item name}

**Important**:
- 55 function items = 55 independent subagent invocations
- Can launch in parallel to improve efficiency
- Do not merge multiple function items into one invocation
```

### Incorrect Example Comparison

| Practice | Problem |
|----------|---------|
| "Help me research function items 1.1 to 1.5" | Task batching, each function item does not get adequate execution |
| "Follow deep_researcher's approach to search for policies and data" | Summarized paraphrasing, loses complete specification in Blueprint |
| "Do something similar to deep_researcher" | Vague instruction, execution may seriously deviate |

## Related Patterns

- **[Prompt-Defined Agent](./COR-01-prompt-defined-agent.md)**: Blueprint is the sole basis for execution
- **[Orchestrated Agent Pipeline](./BHV-01-orchestrated-agent-pipeline.md)**: Orchestrator must invoke correctly when coordinating
- **[Parallel Instance Execution](./BHV-03-parallel-instance-execution.md)**: Each instance invoked independently during parallel execution
- **[Business-Driven Agent Design](./STR-04-business-driven-agent-design.md)**: Each Agent has a clear Blueprint

## Checklist

When designing an Orchestrator, check the following points:

### Invocation Side
- [ ] When invoking other Agents, does the subagent read the Blueprint itself?
- [ ] Is summarizing or paraphrasing Blueprint content avoided?
- [ ] For batch tasks, does each task launch an independent subagent?
- [ ] Is the Blueprint file path clearly specified in the invocation instruction?
- [ ] Are parameters correctly passed in the invocation instruction?

### Verification Side
- [ ] When receiving results, is verification performed item by item against Blueprint completion criteria?
- [ ] Is considering completion based solely on subagent self-report avoided?
- [ ] Are results that do not meet criteria required to be redone or reported as exceptions?

### Boundary Constraints
- [ ] Is it explicitly stated in the invocation instruction that "completion criteria cannot be lowered"?
- [ ] Is it specified that "if encountering difficulties, consult; do not make adjustments on your own"?
