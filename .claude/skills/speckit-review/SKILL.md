---
name: "speckit-review"
description: "Review the whole of a feature's landed implementation against its spec and plan — does the work satisfy what was asked, and do the pieces fit together — then write review.md and append remediation tasks for anything that does not."
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "speckit-pipeline"
  source: "plugins/speckit-pipeline/assets/claude-skills/speckit-review/SKILL.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Read everything the feature actually landed, as one body of work, and answer two
questions the pipeline cannot answer anywhere else:

1. **Does it satisfy the spec?** Not "is every box ticked" — the boxes are ticked
   by the phase that also wrote the code, so they record intent, not outcome.
2. **Do the pieces fit together?** Every implement pass ran in its own process
   with no memory of the others. Each one was individually plausible. Nobody has
   yet read them side by side.

Then write `review.md`, and append a remediation task for every finding serious
enough to block the merge.

## Why this phase exists

Every other check in this pipeline is **artifact-shaped**: does the file exist,
is it over the byte floor, does it still contain template markers, are the boxes
ticked. Those catch a phase that died. None of them can read code, so none of
them can tell a feature that works from a feature that merely has all its files.

And the seam this is aimed at is real and structural. A chunked implement runs
one `## Phase` group per process and hands off through `tasks.md` alone. Pass 4
does not know what pass 2 decided — only what it left on disk. So the defects
that survive to here are specifically the **cross-pass** ones: two passes that
each invented their own helper for the same job, a data shape that drifted
between the producer and its consumer, an interface one pass changed and another
pass's caller still uses the old way, a requirement that every individual task
addressed partially and no task addressed fully.

Look for those. A single-file bug is the cheapest thing in this pipeline to find
later; an architectural mismatch across twelve passes is the most expensive.

## Operating Constraints

**YOU MAY NOT WRITE CODE.** Your write scope is `specs/` and `.specify/` and it
is enforced after you exit by comparing the working tree against what you were
allowed to touch — a phase that writes outside it fails the run. Your job is to
judge and to record. Fixing is `/speckit-implement`'s job, which is why findings
become tasks rather than patches.

Concretely, you write exactly two things:

- `FEATURE_DIR/review.md` — always.
- an appended `## Phase N: Review remediation` section in `FEATURE_DIR/tasks.md`
  — only when there is at least one blocking finding.

**EVERY FINDING CITES `path:line`.** A finding without a location is not a
finding, it is an impression, and an impression cannot be acted on or checked.
This is also what keeps this phase honest: a review that read nothing can
produce fluent prose about a spec it merely paraphrased, and the citations are
what make that distinguishable from work. The verifier requires them.

**A CLEAN REVIEW IS A REAL RESULT.** If the work holds up, say so and cite what
you checked. Do not manufacture findings to look diligent — a `LOW` finding
invented to fill the table costs a human the time to dismiss it, and trains them
to skim the ones that matter. State your coverage honestly instead, including
what you could not check.

## Execution Steps

### 1. Establish context

Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
once from the repo root and parse `FEATURE_DIR` and `AVAILABLE_DOCS`. Derive:

- SPEC = `FEATURE_DIR/spec.md`
- PLAN = `FEATURE_DIR/plan.md`
- TASKS = `FEATURE_DIR/tasks.md`
- CONSTITUTION = `.specify/memory/constitution.md` (if present and not an
  unfilled template)

If `spec.md` or `tasks.md` is missing, STOP and say which prerequisite command to
run. Do not review against artifacts that are not there.

For single quotes in args like "I'm Groot", use escape syntax: e.g. `'I'\''m Groot'`.

### 2. Read what actually landed

The diff against the base branch is your primary input — it is the only view of
the feature as a whole rather than as a task list.

```sh
git merge-base HEAD origin/main          # or the repo's default branch
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

If the diff is very large, work from `--stat` to choose what to read in full, and
say in your coverage notes which files you read and which you sampled. **Do not
`cat` the whole diff into the transcript if it is enormous** — every later turn
re-reads it. Read by file, in the order `--stat` suggests matters.

If there is no base branch to compare against (a detached checkout, a missing
remote), fall back to reading the files that `tasks.md` and `plan.md` name, and
record in `review.md` that you reviewed the present state rather than a diff.
Say which; they are different evidence.

### 3. Build the obligation inventory

From SPEC: functional requirements (FR-###), success criteria (SC-###) that
require buildable work, user stories and their acceptance scenarios, edge cases.
From PLAN: architecture and stack decisions, the data model, named touch-points,
technical constraints. From CONSTITUTION: MUST/SHOULD principles.

Every item gets a stable key. This inventory is what you report coverage
against, so it is also the honest denominator for "I checked N of M".

### 4. Judge

Work through four passes. They are ordered by what costs most to find late.

**a. Coherence across passes.** The one nothing else looks at.
- Duplicated abstractions: two implementations of the same job, introduced by
  different passes.
- Interface drift: a signature, schema, event name or column changed in one
  place and still consumed the old way in another.
- Data-shape mismatches between producer and consumer.
- Dead ends: code written by an early pass that no later pass ever wired in.
- Inconsistent conventions within the feature — error handling, validation,
  naming — where the passes each chose differently.

**b. Spec conformance.** For each obligation: satisfied, partially satisfied,
absent, or contradicted. A ticked task whose code does not satisfy its
requirement is a finding, and an important one: it means `tasks.md` is now
actively misleading.

**c. Correctness and safety.** Logic errors, unhandled failure paths, missing
validation on inputs the spec says are untrusted, resource leaks, obvious
injection or authz gaps in the new code. Bounded to the feature's diff — this is
not a whole-repo audit.

**d. Test integrity.** Do the tests exercise the requirement, or do they assert
the implementation back to itself? Tests that pass against a mock of the thing
under test, assertions with no failing case, and a suite that was made green by
weakening an assertion are all findings. Also: obligations with no test at all.

### 5. Classify

Severity, which decides whether a finding blocks the merge:

- **BLOCKER** — violates a constitution MUST, leaves a P1 user story
  non-functional, contradicts the spec, or would corrupt data / expose a
  vulnerability. Blocks the merge.
- **MAJOR** — an obligation is partially satisfied or a cross-pass mismatch will
  misbehave under a realistic input. Blocks the merge.
- **MINOR** — a real defect that is safe to ship and fix later. Does not block.
- **NOTE** — an observation for the reader. Not a defect, does not block, and
  must not be padded.

BLOCKER and MAJOR are the blocking set. Be willing to return zero of them.

### 6. Write `review.md`

Write to `FEATURE_DIR/review.md`, in this shape:

```markdown
# Review: <feature name>

Reviewed <N> file(s) changed across <M> commit(s), against <base>...HEAD.
Read in full: <paths>. Sampled: <paths>. Not reviewed: <paths, and why>.

## Verdict

<one paragraph: does this satisfy the spec and hang together, and what would
you do about it. Lead with the answer.>

## Findings

- [ ] 🛑 BLOCKER F1 — <one-line claim>
      where:  src/orders/repo.py:412, src/orders/api.py:88
      why:    <what is actually wrong, and the input or state that makes it wrong>
      owed:   <what would fix it>
      traces: FR-008

- [ ] MAJOR F2 — <one-line claim>
      where:  src/queue/worker.ts:145
      ...

- [ ] MINOR F3 — ...

- NOTE F4 — <observation>  (no checkbox: notes are not work)

## Coverage

| Checked | Count | Satisfied | Partial | Absent | Contradicted |
|---|---|---|---|---|---|
| Functional requirements | 14 | 12 | 1 | 1 | 0 |
| Success criteria | 6 | 6 | 0 | 0 | 0 |
| Constitution principles | 5 | 5 | 0 | 0 | 0 |

## What I could not check

<the honest list: a browser flow, a production dashboard, a load characteristic,
anything needing credentials this phase does not have. Name them — a gap you
name is a gap a human can close, and one you omit reads as a pass.>
```

Rules the verifier enforces, so get them right:

- Each blocking finding is an **unchecked checkbox** whose text begins
  `🛑 BLOCKER` or `MAJOR` after the box. Unchecked means unresolved.
- At least one `path:line` citation must appear in the file.
- `NOTE` items take no checkbox — they are not work and must not gate.
- If there are no findings at all, write `## Findings` with the single line
  `No findings. <what you checked and how.>` — the section is never empty and
  never omitted.

### 7. Append remediation tasks

**Only if there is at least one BLOCKER or MAJOR.** Otherwise leave `tasks.md`
byte-for-byte unchanged — an empty header is noise the next pass has to read.

Appending, per the same contract `/speckit-converge` uses:

1. Find the maximum existing task ID `M` and the highest phase number; the new
   phase is the next one.
2. Append one section: `## Phase N: Review remediation`.
3. One checklist item per blocking finding, BLOCKERs first, IDs `T{M+1:03d}`
   onward, never reusing or renumbering an existing ID:

   ```markdown
   - [ ] T091 <imperative fix> — review F1 (BLOCKER), src/orders/repo.py:412
   ```

4. Do not modify, reorder or re-tick any existing task. Do not touch `spec.md`
   or `plan.md`.

Carrying the finding id and the location into the task text is what makes the
remediation traceable back to the reasoning — the implement pass that picks it up
is a fresh process with no access to this review's thinking.

### 8. Report

Finish with the counts and the handoff:

- On blocking findings: say how many of each severity, that `tasks.md` now has N
  new tasks under `## Phase N: Review remediation`, and that
  `spec-run --resume` will run implement over them and then review again.
- On a clean review: say so, with the coverage counts and the unchecked list, and
  that the feature is ready for a human to merge.

## Done When

- [ ] The landed work was read as a whole — diff-first, or present-state with
      that stated explicitly
- [ ] `review.md` written with a verdict, findings that each cite `path:line`,
      coverage counts, and an honest list of what could not be checked
- [ ] Remediation tasks appended to `tasks.md` if and only if something blocks
- [ ] No code, `spec.md` or `plan.md` was modified
- [ ] Counts and next action reported
