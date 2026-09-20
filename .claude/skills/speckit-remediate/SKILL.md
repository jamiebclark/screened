---
name: "speckit-remediate"
description: "Analyze spec.md, plan.md and tasks.md for cross-artifact defects and fix them directly, with no approval step."
argument-hint: "Optional focus areas for remediation"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "speckit-pipeline"
  source: "native to this pipeline — not vendored from github-spec-kit"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before remediation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_remediate` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Goal.
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Goal

Do what `/speckit-analyze` only *reports*: find inconsistencies, duplications,
ambiguities, and underspecified items across `spec.md`, `plan.md`, `tasks.md`
and plan's supporting design docs (`data-model.md`, `research.md`,
`contracts/`, `quickstart.md`), then **fix them directly** in the artifacts
that own each fact, with no approval step in between. This command MUST run
only after `/speckit-tasks` has successfully produced a complete `tasks.md`.

**This is the touchless counterpart to `/speckit-analyze`, not a replacement
for it.** `/speckit-analyze` is upstream spec-kit's own command, and it is
deliberately read-only: it reports findings and asks a human before applying
anything. That contract is correct when a human is attending the pipeline.
This command exists for when nobody is: it re-derives the same findings itself
(there is no analyze report file to read — analyze writes none, by design)
and resolves each one on the spot, bounded by the constraints below rather
than by a human's sign-off.

## Operating Constraints

**NEVER touch code.** This phase's writes are confined to `spec.md`, `plan.md`,
`tasks.md`, and plan's own supporting docs inside the feature directory
(`data-model.md`, `research.md`, `contracts/**`, `quickstart.md`, whichever of
these exist). Nothing outside the feature directory. Nothing under a source
path. Fixing code, if code already exists, is `/speckit-implement`'s job, not
this one.

**Fix at the source, not at every quotation.** A duplicated or conflicting
requirement is resolved where it is *defined* — merge or correct it there —
not patched independently everywhere it is echoed. A coverage gap (a
requirement or success criterion with no task) is closed by **appending** a
new task to `tasks.md`, using the same append-only discipline as
`/speckit-converge`: never renumber, reorder, or delete an existing task.

**Constitution Authority**: The project constitution (`.specify/memory/constitution.md`)
is **non-negotiable**. A finding that conflicts with a constitution MUST
principle is resolved by adjusting the spec, plan, or tasks — never by editing
or reinterpreting the constitution itself. If the constitution is an unfilled
template, skip constitution checks gracefully rather than failing.

**Do not guess at a product decision.** Most findings are documentation
defects — drift, ambiguity, a missing task — and those get fixed outright.
A few are not: two requirements that are genuinely mutually exclusive, where
either resolution is a legitimate but different product, are not yours to
pick silently. For those, apply the most conservative reading that keeps the
spec internally consistent, record exactly what you chose and why in the
report below, and if no defensible choice exists without narrowing what is
being built, leave that finding unresolved and report `STATUS: needs_input`
naming it — the same escape every other phase in this pipeline has.

## Execution Steps

### 1. Initialize Remediation Context

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
once from repo root and parse JSON for FEATURE_DIR and AVAILABLE_DOCS. Derive
absolute paths for SPEC, PLAN, and TASKS as `/speckit-analyze` does, and also
locate any of `data-model.md`, `research.md`, `contracts/`, `quickstart.md`
under FEATURE_DIR.

Abort with an error message if any required file is missing (instruct the user
to run the missing prerequisite command).

### 2. Run the Analysis

Perform the same detection passes `/speckit-analyze` runs — duplication,
ambiguity, underspecification, constitution alignment, coverage gaps,
inconsistency — over spec.md, plan.md, and tasks.md, informed by the
supporting design docs where relevant (e.g. a data entity referenced in
plan.md but absent from data-model.md, or vice versa). You may invoke the
`speckit-analyze` skill via the Skill tool to produce this finding set rather
than re-implementing the passes from scratch, but either way the finding set
must be freshly derived in this run — there is nothing on disk from a prior
analyze phase to read.

Assign each finding a stable ID and severity (CRITICAL / HIGH / MEDIUM / LOW),
using the same heuristic `/speckit-analyze` uses.

### 3. Resolve Each Finding

For every finding, in severity order:

- Identify which artifact **owns** the fact in question.
- Apply the smallest edit there that resolves it, keeping every other artifact
  that references the same fact consistent with the change (e.g. correcting a
  requirement's wording in spec.md and updating the plan section that quotes it).
- For a coverage gap, append a task to tasks.md instead of editing spec.md or
  plan.md.
- For a genuine product-decision conflict (see Operating Constraints), do not
  edit silently — record it as unresolved and continue with the rest.

### 4. Write the Remediation Report

Write `FEATURE_DIR/remediate-report.md` — this file is the phase's **only**
authority on what happened, so write it even when zero findings existed:

```markdown
## Remediation Report

| ID | Category | Severity | Resolution | Where |
|----|----------|----------|------------|-------|
| A1 | Duplication | HIGH | Merged into FR-003's phrasing | spec.md |
| E2 | Coverage Gap | MEDIUM | Appended T048 | tasks.md |
| F3 | Inconsistency | CRITICAL | UNRESOLVED — mutually exclusive with FR-012, needs a product decision | spec.md |

**Findings:** N total, M resolved, K unresolved (needs_input)
```

### 5. Check for Extension Hooks (after remediation)

- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_remediate` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specify/extensions.yml` does not exist, skip silently

## Operating Principles

### Context Efficiency

- **Minimal high-signal tokens**: Focus on actionable findings, not exhaustive documentation
- **Deterministic results**: Rerunning without changes should produce consistent IDs and counts, and a clean artifact set should leave every file byte-for-byte unchanged

### Remediation Guidelines

- **NEVER modify code**, and never write outside the feature directory
- **NEVER hallucinate missing sections** (if a supporting doc is absent, skip it rather than inventing content for it)
- **Prioritize constitution violations** (these are always CRITICAL, and are fixed in spec/plan/tasks, never in the constitution)
- **Never silently resolve a product decision** — report it as `needs_input` instead
- **Report zero issues gracefully** (write the report with zero rows and a clean summary; do not skip writing it)

## Context

$ARGUMENTS
