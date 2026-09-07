# Specification Quality Checklist: List Item Curation (hide, tags, stats)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-06
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

- Validation run 1 found three leaks and one unmeasurable criterion; all four were fixed in run 2,
  after which every item passes:
  - FR-007 described the "read path" not partitioning items — reworded to describe the presentation
    the user sees.
  - SC-009 named test types rather than an observable outcome — reworded to hand-counted verification
    of every stats figure across the three journeys.
  - An assumption named two specific outbound services and another restated the storage mechanics —
    both genericised, with the requester's technical conditions left intact in the **Input** field.
- All technical vocabulary now sits inside the verbatim quote of the request in **Input**, which is
  preserved deliberately so the planning phase inherits the requester's stated constraints (shared
  per-list hidden flag, no per-viewer scoping, reuse of the existing ordering helper, migrations
  only).
- Three capabilities were mapped to three independently testable stories in the requester's stated
  build order: P1 hiding (non-destructive alternative to deletion, and a prerequisite for two of the
  four stats figures), P2 tagging (supplies the fourth figure), P3 stats breakout (read-only summary,
  depends on both).
- Assumptions worth a second look before planning, in order of impact:
  1. **Permissions**: hiding and tagging are open to owners and contributors on _any_ item, which
     diverges from the existing per-item notes rule (owner or the member who added the item). Chosen
     because hidden state and tags are shared list-level curation; if the wrong call, it is a one-line
     change to the permission check but changes several acceptance scenarios.
  2. **Reordering while filtered**: drag-to-reorder is withdrawn while hidden items are filtered out,
     to protect the ranked-order fix from feature 009. The alternative — allowing drags over a partial
     sequence — needs its own position-mapping rules.
  3. **Decades scope**: the decades figure covers all items including hidden ones, since only the tag
     figure was explicitly scoped to non-hidden items.
  4. **Default view and filter persistence**: hidden items show faded by default and the filter lives
     in the page address alongside the existing sort control, not saved per account.
- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`.
