# Workspace Isolation

**Category**: Structure
**Necessity**: Recommended

## Problem

How to prevent Agents from accessing or modifying files they should not access?

AI Agents have the capability to read and write the filesystem. Without restrictions, they may:
- Accidentally read files from other projects, causing context pollution
- Accidentally modify system files or data from other projects
- Lead to interference between different projects
- Make system behavior dependent on state external to the project

## Context

This pattern applies to the following scenarios:

- Multiple independent projects exist in the same environment
- Agents have filesystem access capabilities
- Need to ensure repeatability of system behavior
- Need clear data dependency boundaries

## Forces

- **Security vs Convenience**: Restricting access increases security, but may add inconvenience
- **Isolation vs Sharing Needs**: Complete isolation may prevent legitimate resource sharing
- **Explicit Constraints vs Implicit Assumptions**: Explicit constraints are more reliable, but add configuration burden

## Solution

**Explicitly declare workspace boundaries at the beginning of each Agent Blueprint, prohibiting reading or writing any files outside the designated directory.**

### Standard Constraint Declaration

```markdown
## Workspace Isolation Requirement

**IMPORTANT**: You must work ONLY within the project directory `{PROJECT_PATH}/`.
- You **MUST NOT** read any files outside this directory
- You **MUST NOT** write any files outside this directory
- All file paths you use must be relative paths from this project root or absolute paths within this directory
- This constraint ensures system isolation and prevents context pollution
```

### Placement

The constraint declaration should be placed at the **very beginning** of the Agent Blueprint (immediately after the title), ensuring:
1. It is read first by the Agent
2. Its importance is emphasized
3. Boundaries are established before any specific tasks

## Consequences

### Benefits

- **Prevent Context Pollution**: Agents won't accidentally read files from other projects
- **Ensure Repeatability**: System behavior depends only on files within the project
- **Support Parallel Projects**: Multiple research projects can coexist safely
- **Clear Dependency Boundaries**: All data dependencies are visible within the project directory
- **Facilitate Project Migration**: The entire project directory can be moved independently

### Liabilities

- **Limited Flexibility**: Cannot access public resources outside the project
- **May Require Duplication**: Shared resources may need to be copied to each project
- **Relies on Convention Rather Than Technical Enforcement**: Runtime may not technically prevent out-of-bounds access

## Implementation Guidelines

### Blueprint Template

```markdown
# Agent Name

## Workspace Isolation Requirement

**IMPORTANT**: You must work ONLY within the project directory `industry_assessment/`.
- You **MUST NOT** read any files outside this directory
- You **MUST NOT** write any files outside this directory
- All file paths you use must be relative paths from this project root or absolute paths within this directory
- This constraint ensures system isolation and prevents context pollution

---

## Your Role
[Subsequent content...]
```

### Path Usage Conventions

**Recommended**: Use project-relative paths
```markdown
## Output Location
`workspace/{INDUSTRY_ID}/01.materials/`
```

**Acceptable**: Use absolute paths within the project
```markdown
## Output Location
`/full/path/to/project/workspace/{INDUSTRY_ID}/01.materials/`
```

**Prohibited**: Reference paths outside the project
```markdown
## Reference Materials
Read `/etc/config` or `../other-project/workspace/`  # Prohibited!
```

### Handling Shared Resources

If multiple projects truly need to share certain resources:

1. **Copy into Project**: Copy shared resources into each project's `references/` directory
2. **Symbolic Links**: Use symbolic links where technically feasible (must be documented)
3. **External Retrieval**: Obtain public resources via network rather than accessing other local locations

### Verifying Isolation

A project should be able to pass the following test:
1. Move the project directory to another location
2. Re-execute the system
3. It should run normally and produce the same results

## Examples

### From the industry_assessment System

Every Agent Blueprint includes a workspace isolation declaration:

**01.initial_scanner.md**:
```markdown
# Initial Scanner

## Workspace Isolation Requirement

**IMPORTANT**: You must work ONLY within the project directory `industry_assessment/`.
- You **MUST NOT** read any files outside this directory
- You **MUST NOT** write any files outside this directory
- All file paths you use must be relative paths from this project root or absolute paths within this directory
- This constraint ensures system isolation and prevents context pollution

---

## Your Role
...
```

**Requirement in generator.md**:
```markdown
**CRITICAL WORKSPACE ISOLATION REQUIREMENT**:

Every agent blueprint MUST include explicit instructions at the
beginning that enforce workspace isolation:

```
IMPORTANT: You must work ONLY within the project directory: {PROJECT_ID}/
- You MUST NOT read any files outside this directory
- You MUST NOT write any files outside this directory
- All file paths you use must be relative to this project root
- This constraint prevents context pollution and ensures system isolation
```

This workspace boundary constraint must be emphasized in all agent blueprints.
```

## Related Patterns

- **[Prompt-Defined Agent](./COR-01-prompt-defined-agent.md)**: Workspace constraints are part of the Blueprint
- **[Filesystem Data Bus](./STR-02-filesystem-data-bus.md)**: Data bus is confined within the workspace
- **[Reference Data Configuration](./STR-01-reference-data-configuration.md)**: Reference data should be located within the workspace

## Variants

### Multi-Level Workspace
For large systems, multi-level workspaces may be needed:
```
organization/
├── shared/           # Organization-level shared resources
├── project_a/        # Project A workspace
└── project_b/        # Project B workspace
```
Agents can access `shared/` and their own project directory.

### Read-Only External Access
Some scenarios allow read-only access to resources outside the project:
```markdown
- You MAY read files from `../shared-references/`
- You **MUST NOT** write any files outside the project directory
```

### Temporary Directory Exception
Allow access to system temporary directories for intermediate processing:
```markdown
- You MAY use the system temporary directory for intermediate processing
- Final output MUST be written within the project directory
```
