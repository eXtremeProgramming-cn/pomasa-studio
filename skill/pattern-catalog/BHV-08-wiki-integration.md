# Wiki Integration

**Category**: Behavior
**Necessity**: Optional

## Problem

How to transform research output into a persistent, compounding knowledge graph rather than a disposable document?

Standard research pipelines produce a report as their final deliverable — a linear document that captures the findings of a single run. But some research programs are iterative: successive runs investigate different aspects of a broad topic (different commodities, regions, time periods), and the findings need to accumulate into a shared knowledge base where concepts are interlinked, contradictions are preserved, and each run enriches what came before.

A report is a snapshot. A wiki is a compounding artifact.

Without a dedicated integration stage, research findings remain trapped in run-private workspaces. Connections between concepts discovered in different runs are never made explicit. Contradictions between sources are lost when a new run overwrites old conclusions. The knowledge doesn't compound.

## Context

This pattern applies when:

- The research program will run multiple times on related topics
- Findings should accumulate into a persistent knowledge graph
- Concepts need typed relationships (not just hyperlinks) — causal chains, contradictions, material conditions
- The knowledge base should be navigable in tools like Obsidian
- The user selects "Wiki" as a deliverable format

This pattern may be skipped when:

- The output is a single document (report, dossier, paper)
- Findings don't need to persist across runs
- The MAS runs only once
- Simple note-taking or document storage is sufficient

## Forces

- **Synthesis vs Accumulation**: A report synthesizes everything into a narrative; a wiki accumulates discrete nodes that can be traversed in multiple ways
- **Authorial control vs Emergent structure**: Reports have a single narrative arc; wikis have emergent structure from cross-linking
- **Completeness vs Incrementalism**: A report must be complete on delivery; a wiki is always incomplete and always growing
- **Flat links vs Typed links**: Standard wikilinks say "these are related"; typed links say *how* they're related
- **Structural evidence vs Visible evidence**: The evidence chain serves two consumers — pipeline machinery (which wants typed, queryable YAML) and a human reader in Obsidian (who sees only body prose, since nested-YAML wikilinks render poorly). Both surfaces are required.

## Solution

**Add a wiki-integrator stage at the end of the research pipeline. This agent reads the verified analysis output, decomposes it into concept files with typed links, creates or extends flow files, flags contradictions with existing content, and writes everything to a persistent `wiki/` directory that survives across pipeline runs.**

### The Wiki Data Model

The wiki has three content primitives, all stored as markdown files with YAML frontmatter and Obsidian `[[wikilinks]]` for navigation, plus two navigation files (`index.md` and `log.md`) described in the Index and Navigation section below:

#### 1. Concept (`wiki/concepts/{slug}.md`)

A node in the knowledge graph — a thing, process, event, institution, or idea.

```yaml
---
title: Primitive Accumulation
aliases: [original accumulation]
era: 15th–19th century
region: [Europe, Americas]
domain: [political-economy, colonialism]
tags: [Marx, extraction, capital-formation]

links:
  - target: "[[wiki/concepts/potosi-silver]]"
    type: caused-by
    evidence:
      - citation: "[Marx, Capital Vol. I, Ch. 31 (1867)](https://www.marxists.org/archive/marx/works/1867-c1/ch31.htm)"
        source_id: "[[library/books/markdown/marx-capital-v1-1867]]"
    note: "Silver extraction as material basis for European capital formation"

  - target: "[[wiki/concepts/protestant-ethic-thesis]]"
    type: contradicts
    contradiction: "[[wiki/contradictions/primitive-accumulation-vs-protestant-ethic]]"

flows:
  - "[[wiki/flows/potosi-silver-to-european-capitalism]]"
---

# Primitive Accumulation

[Body prose — the analytical narrative. Inline footnote markers `[^N]` follow
sentences that materially rely on a source. Concrete quantitative claims —
numbers with units, year ranges, named-actor + action verb — should carry a
marker.]

Spain extracted approximately 150,000 tons of silver from the Americas
between 1500 and 1800.[^1] The Crown's debt service to Genoese bankers
absorbed roughly half of arriving bullion through the Age of Genoa
(1557–1627).[^2]

## References

[^1]: [Marx, *Capital* Vol. I, Ch. 31 (1867)](https://www.marxists.org/archive/marx/works/1867-c1/ch31.htm) — [[library/books/markdown/marx-capital-v1-1867]]
[^2]: [Drelichman & Voth, *Lending to the Borrower from Hell* (2014)](https://example.org/drelichman) — [[library/books/markdown/drelichman-lending-2014]]
```

#### 2. Flow (`wiki/flows/{slug}.md`)

An ordered traversal of concepts that makes an argument. First-class authored objects, not derived from graph traversal.

```yaml
---
title: Potosí Silver → European Capitalism
commodity: silver
era: 1545–1800

steps:
  - concept: "[[wiki/concepts/potosi-mines]]"
    role: "The extraction site"
    link_to_next:
      type: causes
      summary: "Mines required coerced labour"

  - concept: "[[wiki/concepts/mita-forced-labour]]"
    role: "The labour regime"
    link_to_next:
      type: produces
      summary: "Forced labour extracted silver at scale"

  - concept: "[[wiki/concepts/industrial-capitalism]]"
    role: "The system colonial wealth made possible"

related_flows:
  - "[[wiki/flows/atlantic-slavery-to-industrial-revolution]]"
---
```

#### 3. Contradiction (`wiki/contradictions/{slug}.md`)

A genuine disagreement between sources or frameworks, preserved as an analytical object.

```yaml
---
title: Primitive Accumulation vs Protestant Ethic
positions:
  - label: "Material extraction thesis"
    concepts: ["[[wiki/concepts/primitive-accumulation]]"]
    proponents: [Marx, Galeano, Frank, Williams]
    claim: "European capital formation driven by colonial extraction"
    evidence:
      - citation: "[Marx, Capital Vol. I, Ch. 31 (1867)](https://www.marxists.org/archive/marx/works/1867-c1/ch31.htm)"
        source_id: "[[library/books/markdown/marx-capital-v1-1867]]"

  - label: "Protestant ethic thesis"
    concepts: ["[[wiki/concepts/protestant-ethic-thesis]]"]
    proponents: [Weber]
    claim: "Calvinist work ethic created cultural preconditions for accumulation"
    evidence:
      - citation: "Weber, The Protestant Ethic and the Spirit of Capitalism (1905)"
        source_id: "[[library/books/markdown/weber-protestant-ethic-1905]]"

resolution:
  status: contested
  note: "Material thesis has stronger evidentiary base, but not strictly incompatible"

related_concepts:
  - "[[wiki/concepts/primitive-accumulation]]"
  - "[[wiki/concepts/protestant-ethic-thesis]]"
---
```

### Typed Link Vocabulary

| Type | Meaning |
|------|---------|
| `causes` / `caused-by` | A brought about B / inverse |
| `material-condition-for` | A was a necessary material precondition for B |
| `contradicts` | A and B are in tension |
| `dialectically-resolves` | C resolves the contradiction between A and B |
| `has-instance` / `instance-of` | General category / specific instance |
| `precedes` / `follows` | Historical sequence |
| `ideological-expression-of` | A is an ideological justification of B |
| `enables` | A makes B possible without direct causation |
| `produces` | A generates B as output |
| `transforms-into` | A evolves into B |
| `reproduces` | A sustains or recreates B |

This vocabulary is extensible but should grow slowly and deliberately.

### Evidence Format

Each typed link carries evidence entries with two fields:

- **`citation`** (required): Human-readable citation. Uses markdown link syntax when a URL is available: `[Author, Title (Year)](url)`. Plain text when no URL exists.
- **`source_id`** (required): Obsidian backlink to the library file: `"[[library/books/markdown/filename]]"`. Serves dual purpose: (a) the pipeline uses it to track which sources have been integrated, (b) the user can click through to the raw source text.

This design ensures the wiki is **self-contained for publishing** (citations are human-readable with clickable URLs) while remaining **machine-trackable for incremental updates** (source_id backlinks enable set comparison across runs).

#### URL is the library stub's `url:` field

The URL inside a citation's markdown link is the **byte-identical value of the source library stub's `url:` field**. The integrator resolves `source_id` → library stub → reads `url:` → uses that exact value. It does not abbreviate to a domain, paraphrase from analysis-file context, or invent placeholders.

When the stub's `url:` is `unknown`, `Not specified`, empty, or missing, drop the markdown link wrapping and write the citation as plain text:

```yaml
- citation: "Hamilton, *American Treasure and the Price Revolution in Spain* (1934)"
  source_id: "[[library/books/markdown/hamilton-american-treasure-1934]]"
```

The `source_id` wikilink still gives the reader click-through to the library stub. The same rule binds the body-prose footnote layer (citation strings are byte-identical between frontmatter and `## References`).

The failure mode this prevents is silent: integrators that generate URLs from analysis-file context produce bare-domain URLs (`https://lexence.com`) that render as clickable links pointing at the wrong page. The library stub is the canonical source.

### Body-Prose Footnote Layer

Frontmatter is the structural evidence chain — canonical, queryable, the graph data. But Obsidian renders top-level scalar/array properties only; wikilinks nested inside `links[].evidence[].source_id` show as raw text or orange unresolved badges. To surface evidence to the human reader, every concept, flow, and contradiction file carries a body-prose footnote layer that mirrors the frontmatter citations: two surfaces, one source of truth.

#### Format

Inline footnote markers in body prose:

```markdown
Spain extracted approximately 150,000 tons of silver
between 1500 and 1800.[^1] The Crown's debt service to Genoese bankers
absorbed roughly half of arriving bullion through 1557–1627.[^2][^3]
```

A `## References` section as the final body section:

```markdown
## References

[^1]: [Author, *Title* (Year)](https://url) — [[library/articles/{slug}]]
[^2]: [Author, *Title* (Year)](https://url) — [[library/articles/{slug}]]
[^3]: Author, *Title* (Year) — [[library/books/markdown/{slug}]]
```

#### Rules

- **Numbering**: 1-indexed per file, in order of first body mention.
- **Marker placement**: at the end of the sentence that materially relies on the source, before terminating punctuation if it would visually separate the marker from the claim. Multiple sources stack as `[^1][^2]` with no space between markers.
- **Both halves required when both exist**: external markdown link AND library wikilink, separated by ` — ` (em dash with single spaces). When the source has no live URL, the citation half is plain text (no markdown link), but the library wikilink is always present.
- **Citation strings match frontmatter**: the text in the footnote matches the corresponding frontmatter `citation` value byte-for-byte; the library wikilink matches the frontmatter `source_id` value.
- **Frontmatter ↔ footnote correspondence**: every unique `source_id` across all frontmatter `links[].evidence[]` entries appears as exactly one footnote in `## References`; every footnote corresponds to a frontmatter `source_id`. No orphans on either side.
- **Inline marker coverage**: required for concrete quantitative claims (numbers with units, year ranges, named-actor + action verb). Frontmatter sources with no anchored claim in body may appear as a footnote without an inline marker — they are structural evidence for the typed link itself, not for any specific sentence.
- **Markers stay punctuation, not prose**: the markers do not count as "according to" / literature-review hedging. The fact still gets stated as confident assertion.

### Relationship to Library and Workspace

```
library/          →  Permanent, append-only raw materials (BHV-07)
workspace/{run}/  →  Ephemeral pipeline data bus (STR-02)
wiki/             →  Permanent, mutable knowledge graph (this pattern)
```

The library feeds the wiki through the integration stage. The workspace is consumed and discarded. The wiki compounds.

## Consequences

### Benefits

- **Compounding knowledge**: Each pipeline run enriches the wiki rather than producing an isolated document
- **Cross-run discovery**: Concepts discovered in different runs become linked through typed relationships
- **Preserved contradictions**: Disagreements between sources are first-class objects, not silently overridden
- **Obsidian-native**: Full graph view, backlinks panel, and search work out of the box
- **Publishable**: Wiki is self-contained — no runtime dependency on library or workspace
- **Incremental**: Only new material is added; existing content is never deleted

### Liabilities

- **No linear narrative**: A wiki is navigable but not readable front-to-back like a report. Flows partially address this, but they're not a substitute for a well-crafted document
- **Frontmatter complexity**: YAML frontmatter with typed links is more complex than plain markdown
- **Requires editorial judgment**: The integrator agent must decide what becomes a concept, what relationships to type, and what rises to the level of a contradiction
- **Backlink maintenance**: Bidirectional links must be kept consistent across files
- **Can coexist with reports but doesn't replace them**: For a polished deliverable, a report-writer stage may still be needed alongside wiki integration

## Implementation Guidelines

### Wiki-Integrator Agent Blueprint Structure

The wiki-integrator is typically the final stage of the pipeline (or second-to-last if a quality reviewer follows). It reads from the verified analysis and writes to `wiki/`.

```markdown
# Wiki Integrator

## Workspace Isolation
- Read from: workspace/{RUN_ID}/, library/, wiki/
- Write to: wiki/concepts/, wiki/flows/, wiki/contradictions/ only

## Input Parameters
- {RUN_ID}: Identifier of the completed research run
- {FLOW_SLUG}: Primary flow this run contributes to

## Workflow

### Stage 1: Inventory Existing Wiki State
- List existing concept, flow, and contradiction files
- For each relevant concept: extract all source_id values into EXISTING_SOURCES set
- This determines what is new vs already integrated

### Stage 2: Extract Wiki-Ready Material from Research Output
- Read analysis artifacts from workspace/{RUN_ID}/
- For each claim/entity/relationship: identify concept, typed link, evidence
- Resolve library paths for source_id backlinks
- Produce changeset: NEW_CONCEPTS, UPDATED_CONCEPTS, NEW/UPDATED_FLOW, NEW_CONTRADICTIONS

### Stage 3: Validate Changeset
- No orphan links (every target exists or will be created)
- Bidirectional consistency for important relationships
- Every source_id points to existing library file
- No duplicate evidence (check source_id against EXISTING_SOURCES)
- Link types from controlled vocabulary

### Stage 4: Write to Wiki
- Create new concept files with full frontmatter and substantive body prose
- Update existing concepts: append new links and evidence only (never delete)
- Create/update flow files with step backlinks
- Create contradiction files with bidirectional backlinks
- Ensure all flow references appear in concept files' flows field
- For every citation, resolve `source_id` to the library stub and copy the stub's `url:` field byte-identical into the markdown link; if the stub's `url:` is `unknown`/`Not specified`/empty, drop the markdown link wrapping
- For every file with body prose, append a `## References` section per § Body-Prose Footnote Layer: one footnote per unique frontmatter `source_id`, both citation and library wikilink present
- For every concrete quantitative claim in body prose, insert an inline `[^N]` marker pointing to the corresponding footnote

### Stage 5: Update Index and Log
- Update wiki/index.md with new and modified entries
- Append integration summary to wiki/log.md with timestamp and RUN_ID

### Stage 6: Post-Integration Verification
- Backlink consistency check
- Orphan detection
- Source coverage count
- Footnote-layer consistency: every inline `[^N]` has a matching `[^N]:` definition; every unique frontmatter `source_id` appears as exactly one footnote; every `[[library/...]]` wikilink in `## References` resolves on disk
- URL parity: every citation URL is byte-identical to the source library stub's `url:` field; citations with markdown link wrapping never wrap an unknown URL
- Write integration report to workspace/{RUN_ID}/

## Completion Standards
- [ ] All verified claims integrated with evidence
- [ ] Every source_id points to existing library file
- [ ] Bidirectional backlinks maintained
- [ ] No existing content deleted
- [ ] Every body-prose file ends with a well-formed `## References` section (one footnote per unique frontmatter source_id; both citation and library wikilink present)
- [ ] Footnote-layer consistency check passes (no orphan markers, no orphan footnotes, all library wikilinks resolve)
- [ ] wiki/index.md updated with new entries
- [ ] wiki/log.md appended with integration summary
- [ ] Integration report written to workspace
```

### Key Design Decisions

**Additive only.** The wiki-integrator never deletes existing links, evidence, or prose. If new research contradicts existing content, create a contradiction file rather than removing the old claim. The wiki compounds — each run adds, it does not subtract.

**Slug stability.** Once a concept slug is chosen, it should not change. Other files backlink to it. If a better name emerges, use the `aliases` field.

**Evidence granularity.** One evidence entry per claim per source per typed link. If a single source supports multiple relationships on the same concept, it appears as separate evidence entries on each link.

**Flow authoring is editorial.** Not every concept belongs in a flow. Select the concepts that make the argument, in the order that makes the narrative compelling. Flows are curated paths, not graph dumps.

**Contradiction threshold.** Minor differences go in a typed link's `note` field. Contradiction files are reserved for genuinely incompatible claims about the same relationship.

**Two-layer evidence presentation.** Frontmatter is the canonical, machine-readable evidence chain; the body-prose `## References` footnote layer mirrors it for the human reader. Both are required (see § Body-Prose Footnote Layer).

### Vault Structure When Wiki is Enabled

```
project/
├── library/                    # BHV-07: Cumulative raw materials
│   ├── books/markdown/
│   ├── articles/
│   └── primary-sources/
├── wiki/                       # BHV-08: Persistent knowledge graph
│   ├── index.md                # Content catalog, updated each run
│   ├── log.md                  # Chronological integration log
│   ├── concepts/
│   ├── flows/
│   └── contradictions/
├── agents/                     # Agent blueprints
├── references/                 # STR-01: Domain + methodology + ideology
├── workspace/                  # STR-02: Per-run ephemeral data
└── _output/                    # STR-09: Exported deliverables
```

Both `library/` and `wiki/` are outside `workspace/` — they persist across runs. The workspace is the pipeline's ephemeral data bus.

### Integration with STR-09 (Deliverable Export)

When Wiki is selected alongside other formats (Markdown report, DOCX, PDF), both outputs are produced:
- The report-writer agent generates a linear document in `workspace/`
- The wiki-integrator agent updates the persistent wiki in `wiki/`
- STR-09 exports the report to `_output/`

Wiki and report serve different purposes and can coexist in the same pipeline.

## Index and Navigation

As the wiki grows, the integrator and the user both need a way to see what exists without globbing the filesystem. Two special files at the wiki root serve this purpose:

### `wiki/index.md`

A content-oriented catalog of everything in the wiki. Each entry has a wikilink, a one-line summary, and key metadata. Organized by type (concepts, flows, contradictions). The wiki-integrator updates this file on every run — adding new entries, never removing old ones.

The index serves double duty: (a) the user browses it to understand the wiki's scope, and (b) the integrator reads it at the start of each run to quickly inventory existing content without parsing every file's frontmatter.

```markdown
# Wiki Index

## Concepts

| Concept | Summary | Domain | Sources |
|---------|---------|--------|---------|
| [[wiki/concepts/potosi-mines]] | Spanish colonial silver extraction site | mining, colonialism | 4 |
| [[wiki/concepts/mita-forced-labour]] | Coerced indigenous labour system | labour, colonialism | 3 |
...

## Flows

| Flow | Summary | Steps |
|------|---------|-------|
| [[wiki/flows/potosi-silver-to-european-capitalism]] | Silver extraction → European capital formation | 5 |
...

## Contradictions

| Contradiction | Status | Positions |
|---------------|--------|-----------|
| [[wiki/contradictions/primitive-accumulation-vs-protestant-ethic]] | contested | 2 |
...
```

### `wiki/log.md`

A chronological, append-only record of integration events. Each entry records what was added or updated in a given run, with a timestamp and run identifier.

```markdown
# Integration Log

## [2026-04-15] Run: potosi-silver
- Created 5 concepts, 1 flow
- Sources integrated: 6
- New contradictions: 0

## [2026-04-22] Run: atlantic-slavery
- Created 3 concepts, 1 flow
- Updated 1 concept (primitive-accumulation: new has-instance link)
- Sources integrated: 5
- New contradictions: 0
```

The log gives the user a timeline of the wiki's evolution and helps the integrator understand what has been done recently.

### Optional: Search Tooling

At small scale (under ~100 concepts), the index file is sufficient for navigation. As the wiki grows, a local search engine becomes valuable. Tools like [qmd](https://github.com/tobi/qmd) provide hybrid BM25/vector search over markdown files with LLM re-ranking, all on-device. qmd offers both a CLI (so pipeline agents can shell out to it) and an MCP server (so agents can use it as a native tool). This is optional infrastructure — the pattern works without it, but it scales better with it.

## Prior Art

### Karpathy's LLM Wiki (2026)

Andrej Karpathy's "LLM Wiki" pattern describes building personal knowledge bases where the LLM incrementally maintains a persistent wiki — reading sources, extracting key information, and integrating it into existing pages with cross-references and contradiction tracking. The wiki sits between the user and raw sources as a compiled, compounding artifact.

BHV-08 shares the core insight — the wiki as a persistent, compounding artifact maintained by an LLM — but differs in several ways that reflect its embedding in a multi-agent research pipeline:

- **Typed links**: Karpathy's wiki uses standard Obsidian wikilinks. BHV-08 adds a controlled vocabulary of relationship types (causes, contradicts, material-condition-for, etc.) that carry semantic meaning beyond "these are related."
- **First-class contradictions**: Rather than noting disagreements inline, BHV-08 promotes contradictions to standalone files with structured positions, evidence, and resolution status.
- **Flows as authored arguments**: Ordered traversals of concepts that make a specific argument, not just navigational paths.
- **Pipeline integration**: BHV-08 is a stage in a multi-agent pipeline with formal handoffs, verification gates, and workspace isolation. Karpathy's pattern is conversational — the user and LLM collaborate interactively.
- **Evidence tracking**: Dual-purpose `citation` + `source_id` format enables both human-readable publishing and machine-trackable incremental updates across pipeline runs.
- **Index and log**: Adapted from Karpathy's design — index.md for content navigation, log.md for chronological tracking of integration events.

The patterns are complementary. Karpathy's LLM Wiki is well suited to interactive, conversational knowledge building. BHV-08 is designed for automated research pipelines where findings must be systematically decomposed, verified, and integrated with formal evidence chains.

### Bush's Memex (1945)

Vannevar Bush's "As We May Think" imagined a personal knowledge store with associative trails between documents — a vision closer to the wiki pattern than to what the web became. Bush's unsolved problem was who does the maintenance. The LLM handles that.

## Examples

### Generic: Multi-Run Research Accumulation

Any research program that investigates a broad topic through successive focused runs benefits from wiki integration. The pattern is domain-agnostic:

```
Run 1: {subtopic-A}
  → Creates: concepts for key entities, processes, institutions discovered
  → Creates: a flow tracing the causal chain within this subtopic
  → Library grows with source materials
  → Index and log updated

Run 2: {subtopic-B}
  → Creates: new concepts specific to this subtopic
  → Updates: existing concepts that connect to subtopic-B (new typed links + evidence)
  → Creates: new flow; adds related_flows links to existing flows
  → May create contradictions where subtopic-B's sources disagree with subtopic-A's
  → Cross-links to concepts from Run 1

Run 3: {subtopic-C}
  → Same pattern: create, update, cross-link, flag contradictions
  → The wiki now has a graph connecting all three subtopics
```

Each run finds concepts from previous runs already in the wiki. The integrator reads the index and checks source_id backlinks to know what has been incorporated, adds only new material, and weaves the new concepts into the existing graph.

### Case Study: Economic History (capitalwiki)

A research program tracing the history of capitalism through commodity flows. Each run investigates one commodity thread:

- **Run 1 (potosi-silver)**: Creates concepts for Potosí mines, mita forced labour, silver flows, primitive accumulation, industrial capitalism. Creates a flow tracing silver extraction to European capital formation. Library grows with Galeano, Wallerstein, etc.
- **Run 2 (atlantic-slavery)**: Creates concepts for the Atlantic slave trade, sugar plantations, triangular trade. Updates primitive-accumulation with a new has-instance link. Creates a new flow and cross-links to Run 1's flow.
- **Run 3 (opium-trade)**: Creates concepts for the Opium Wars, Canton system. Creates a contradiction file for free trade vs colonial monopoly. Cross-links to concepts from both previous runs.

## Related Patterns

- **[Cumulative Project Library](./BHV-07-cumulative-project-library.md)**: The library provides raw materials; the wiki provides synthesized knowledge. Library is append-only; wiki is mutable. Both persist across runs.
- **[Progressive Data Refinement](./BHV-04-progressive-data-refinement.md)**: The wiki is the final refinement level — raw materials (library) → structured data (workspace) → analysis (workspace) → knowledge graph (wiki).
- **[Verifiable Data Lineage](./QUA-03-verifiable-data-lineage.md)**: Evidence entries with citation + source_id maintain end-to-end traceability from wiki concept → library source → original URL.
- **[Composable Document Assembly](./STR-05-composable-document-assembly.md)**: An alternative final stage for linear documents. Wiki integration and document assembly can coexist in the same pipeline.
- **[Grounded Web Research](./BHV-05-grounded-web-research.md)**: Ensures raw materials in the library are verbatim originals, which the wiki can then cite with confidence.
- **[Filesystem Data Bus](./STR-02-filesystem-data-bus.md)**: The workspace data bus is ephemeral; the wiki is persistent. They serve different purposes and should not be conflated.

## Checklist

When generating a wiki-integrator agent, confirm:

- [ ] Wiki data model (concepts, flows, contradictions) is defined in a reference file?
- [ ] Typed link vocabulary is specified?
- [ ] Evidence format includes both citation and source_id?
- [ ] Citation URL rule is enforced (byte-identical to library stub's `url:` field; markdown link dropped when `url:` is unknown)?
- [ ] Body-prose footnote layer is specified (inline `[^N]` markers + `## References` section)?
- [ ] Frontmatter ↔ footnote correspondence rule is enforced (every unique frontmatter `source_id` maps to exactly one footnote, and vice versa)?
- [ ] Footnote-layer consistency and URL parity are part of post-integration verification?
- [ ] Agent reads existing wiki state before writing (incremental updates)?
- [ ] Agent validates changeset before writing (no orphan links, no duplicate evidence)?
- [ ] Agent is additive-only (never deletes existing content)?
- [ ] Bidirectional backlinks are maintained (concept ↔ flow, concept ↔ contradiction)?
- [ ] wiki/index.md is created and updated on each run?
- [ ] wiki/log.md is appended with integration summary on each run?
- [ ] Integration report is written to workspace after each run?
- [ ] wiki/ directory is outside workspace/ (persists across runs)?
- [ ] library/ backlinks use Obsidian [[wikilink]] syntax?

## When Not to Use This Pattern

- **Single-run research**: Output is a one-off document, no accumulation needed
- **Simple note-taking**: Plain markdown files without typed relationships are sufficient
- **Real-time systems**: Wiki integration is a batch process, not suitable for streaming
- **No Obsidian dependency acceptable**: The data model relies on [[wikilinks]] and YAML frontmatter conventions that work best in Obsidian
