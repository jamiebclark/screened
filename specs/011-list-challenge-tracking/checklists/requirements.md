# Specification Quality Checklist: List Challenge Tracking

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`

### Validation record

Two iterations were run.

**Iteration 1 findings and fixes:**

- _No implementation details_ — initially failed. The body named the concrete storage shape the requester
  decided on (record names, column names, uniqueness constraints, named source files). Fixed by moving all
  of it out of the requirement and entity sections; the requester's technical conditions are preserved
  verbatim in the spec's **Input** field and pointed at from the final Assumptions bullet, following the
  convention used by `specs/010-list-item-curation/spec.md`. The body now describes only observable
  behaviour: "a list MUST be able to hold tags of its own", "renaming a tag MUST change how it reads
  everywhere it is used".
- _Requirements are testable_ — initially failed on two counts. "Call clear attention to tags without
  wrecking grid density" was untestable as written; replaced with FR-028/FR-029 and SC-007, which pin it
  to "posters per row unchanged" and an explicit overflow rule. "Watches inside the window" was ambiguous
  at the boundary; FR-017 now states that a watch on either boundary counts as inside.
- _Edge cases identified_ — initially thin. Added the cases that decide real behaviour: renaming onto an
  existing tag, deleting a tag many items carry, half-open windows, a departed member's watches, a title
  watched twice in the window, a hidden item watched in the window, an untagged in-window watch, unknown
  year or country, and what happens to tag data written with mixed capitalisation before the change.

**Iteration 2: all items pass.** No [NEEDS CLARIFICATION] markers were needed — the request specified the
scope decisions itself (whose watches count, what the window covers, who may manage tags), and the
remaining gaps had reasonable defaults, all recorded in Assumptions.

### Assumptions flagged for confirmation during `/speckit.clarify` or planning

These do not block planning, but two of them change behaviour a reader might expect otherwise:

1. **Watch-history visibility inside a list is membership-based** — a shared challenge list shows the
   group what each member watched from that list in the window, diverging from the profile-level
   watch-history visibility rules that govern the title and profile pages. This is the only
   privacy-relevant decision in the feature.
2. **Who may set the challenge window** — read as a list _setting_ (whoever may change list settings)
   rather than item curation (owners and contributors). The request named the curation rule for tags only.
3. **Free-typing a tag still creates it** — declaring tags up front is an added planning path, not a new
   restriction on the existing quick-tag flow.
