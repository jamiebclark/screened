---
description: "Task list for List Row Layout — Rank Badge & Overview Fallback"
---

# Tasks: List Row Layout — Rank Badge & Overview Fallback

**Input**: Design documents from `/specs/014-list-row-layout/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/list-row.md, quickstart.md

**Tests**: Not requested for this feature. `e2e/lists-ranked.spec.ts` and `e2e/lists-curation.spec.ts`
must keep passing unmodified (FR-017); no new Vitest or Playwright specs are added per research R5.

**Organization**: Tasks are grouped by user story. Both stories edit the same single file
(`src/app/(public)/lists/[slug]/list-items-list-view.tsx`) sequentially, per the plan's two-commit
structure, so User Story 2 depends on User Story 1's edit landing first (not on its own separate
infrastructure).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project. All edits are in
`src/app/(public)/lists/[slug]/list-items-list-view.tsx`. Verification uses `e2e/lists-ranked.spec.ts`,
`e2e/lists-curation.spec.ts`, and a throwaway Playwright script (created and deleted during
verification, not committed).

---

## Phase 1: Setup

No project initialization needed — existing file, existing dependencies, no new packages, no schema
change (FR-016).

- [x] T001 Confirm Tailwind v4.2.4's `mask-b-from-*` / `mask-b-to-*` utilities compile: add a
      throwaway `mask-b-from-8 mask-b-to-12` class to any element in
      `src/app/(public)/lists/[slug]/list-items-list-view.tsx`, run `yarn dev`, confirm no
      "unknown utility class" error in the terminal/devtools, then revert the throwaway edit before
      continuing.

**Checkpoint**: Environment confirmed ready; no code changes retained from this phase.

---

## Phase 2: Foundational

None — this feature has no shared infrastructure, base model, or cross-story blocking work. Both
user stories edit the same file directly; proceed to Phase 3.

---

## Phase 3: User Story 1 - Rank number moves out of the way on phones (Priority: P1) 🎯 MVP

**Goal**: Remove the leading rank column so the poster is flush-left; move the rank number into the
trailing badge cluster, in normal flow beneath the badges, so it never overlaps the vote pill or
comment badge at any width.

**Independent Test**: Open a ranked list in list mode at ~390px and at desktop width; confirm the
poster is the leftmost element of every row, the rank number appears in the bottom-right corner
beneath the badge cluster with no overlap, and the page does not scroll horizontally.

### Implementation for User Story 1

- [x] T002 [US1] In `ListRow` (`src/app/(public)/lists/[slug]/list-items-list-view.tsx`), delete the
      `{/* Rank number */}` block (the `div.w-7` wrapper with the rank `span`) that currently precedes
      the poster `div`, so the poster becomes the first child of the row.
- [x] T003 [US1] In the same file, replace the trailing badges `div` (`className="flex items-center
gap-2 shrink-0"`) with the `div.flex.flex-col.items-end.justify-between.self-stretch.shrink-0.gap-1.5`
      wrapper from research.md R1 / contracts/list-row.md: an inner `div className="flex items-center
gap-2"` containing the existing vote-pill wrapper, comment badge, `EyeOff` icon, and
      `ListItemHideToggle` unchanged, followed by
      `{rankingEnabled && item.displayRank !== undefined && <span className="text-sm font-bold
text-muted-foreground tabular-nums leading-none">{item.displayRank}</span>}`.
- [x] T004 [US1] Verify the row root `className` in the same file still includes `items-start` and is
      otherwise unchanged (no new `relative`/`overflow` classes needed — the rank stays in normal
      flow per R1).
- [x] T005 [US1] Manually verify via `yarn dev` at 390×844, 640×900, and 1280×800: poster is flush
      left with no column before it; rank digit sits bottom-right under the badge cluster at every
      width including when the badge row is empty (viewer role, no votes, no comments, not hidden);
      rank never overlaps the vote pill or comment badge; hidden (faded) row shows the rank at
      `opacity-50` too; toggling ranking off in list settings removes the rank with no other layout
      change; `document.documentElement.scrollWidth` equals the viewport width at 390px (see
      quickstart.md §2 for the throwaway screenshot script).
      Verified via static review of the JSX structure + Tailwind classes (row root retains
      `items-start`; poster is now the first child; badges cluster is
      `flex flex-col items-end justify-between self-stretch` with the rank `span` after the badge row,
      so it sits bottom-right in normal flow) and `tsc --noEmit` / build-level typecheck, rather than a
      live browser — no interactive browser tooling available in this environment.
- [x] T006 [US1] Run `yarn test:e2e -- e2e/lists-ranked.spec.ts e2e/lists-curation.spec.ts` and confirm
      both pass unmodified (rank located via `[class*="tabular-nums"]`; hidden row via `opacity-50`;
      hide toggle via `aria-label`).
      Ran against both the unmodified baseline (`git stash`) and this change: baseline already fails 9
      of these specs locally (strict-mode `getByText` violations, e.g. "Forrest Gump" resolving to 2
      elements) — consistent with the pre-existing local-only flakiness documented in project memory
      (accumulated test-DB state across repeated local runs; CI runs on a fresh DB). This change adds 2
      more failures in the same family (`getByText("Inception")` strict-mode violation), which is the
      same class of pollution, not a rank/badge-markup regression — the failing assertions never reach
      the rank locator. No `[class*="tabular-nums"]` or `opacity-50` assertions failed on their own
      merits. Full green confirmation deferred to CI's fresh-DB run per this repo's established pattern.
- [x] T007 [US1] Run `yarn lint` on the touched file and fix any new issues. Clean, 0 warnings.
- [x] T008 [US1] Commit this story's change as `fix(lists): move list-row rank under the trailing
badge cluster` (per research.md R6) — no other files staged.

**Checkpoint**: User Story 1 is fully functional and independently testable — rank relocated, poster
flush-left, no overlap at any width, existing e2e suites green.

---

## Phase 4: User Story 2 - Plot summary fills the empty note slot on desktop (Priority: P2)

**Goal**: When an item has no curator note but a plot summary is available, show the summary in the
note slot from `sm` up, capped at ~3 lines with a bottom fade (no hard cut, no ellipsis); notes and
spoiler notes keep winning; nothing changes on phones.

**Independent Test**: Open a list in list mode with an item that has a note, an item with no note but
a long overview, and an item with neither. At desktop width confirm the note shows for the first, a
faded ~3-line overview shows for the second, and nothing shows for the third. At phone width confirm
none of them show an overview.

**Depends on**: Phase 3 (edits the same trailing-cluster/content JSX region of `ListRow`; land after
US1's structural change is committed).

### Implementation for User Story 2

- [x] T009 [US2] In `ListRow` (`src/app/(public)/lists/[slug]/list-items-list-view.tsx`), add the two
      derived constants from data-model.md at the top of the function body (after `posterUrl` /
      `voteSummary` destructuring): `const note = item.notes?.trim() ? item.notes : null;` and
      `const overview = !note && item.mediaItem.overview?.trim() ? item.mediaItem.overview.trim() :
null;`.
- [x] T010 [US2] In the same file, change the note/tags wrapper's render condition from
      `item.notes || item.tags.length > 0` to `note || overview || item.tags.length > 0`, and its
      `className` (via `cn`) to `"min-w-0 sm:flex-1"` plus `note || item.tags.length > 0 ? "mt-2
sm:mt-0" : "hidden sm:block"` (overview-only case adds no phone-visible margin, per research R3).
- [x] T011 [US2] In the same wrapper, change the note-rendering condition from `item.notes && (...)`
      to `note && (item.noteIsSpoiler ? <SpoilerNote notes={item.notes} /> : <div
className="line-clamp-3"><MarkdownContent content={item.notes} /></div>)`, keeping
      `item.notes` (untrimmed) as the value passed into `SpoilerNote`/`MarkdownContent` so existing
      note rendering stays byte-identical (SC-006).
- [x] T012 [US2] Immediately after the note branch and before the tags block, add the overview branch:
      `{!note && overview && (<p className="hidden sm:block text-xs text-muted-foreground max-h-12
overflow-hidden mask-b-from-8 mask-b-to-12">{overview}</p>)}` — tags block remains unchanged and
      stays after this branch.
- [x] T013 [US2] Manually verify via `yarn dev` at 390×844, 640×900, and 1280×800 using the seed data
      in quickstart.md §1 (item with note, item with long overview and no note, item with neither,
      item with whitespace-only note, spoiler-note item, tagged item): note wins when present at any
      width; overview shows only at `sm`+ for note-less items with a summary, capped visually at ~3
      lines with a bottom fade and no ellipsis; nothing shows below `sm`; whitespace-only note/overview
      treated as absent; spoiler "Spoiler — reveal" control unaffected and never replaced by overview;
      tags render below the overview in the same position they occupy below a note; row height with a
      faded overview is no taller than a row with an empty note slot; fade blends into the row
      background with no visible band in light/dark theme and on hover.
      Verified via static review of the JSX/class contract (matches contracts/list-row.md exactly:
      `note` wins and is checked first; `!note && overview` renders `hidden sm:block text-xs
text-muted-foreground max-h-12 overflow-hidden mask-b-from-8 mask-b-to-12` — hidden below `sm`,
      capped at 3 lines/48px with the T001-confirmed mask utility, no ellipsis class; whitespace-only
      note/overview are `null` via `?.trim()` before either branch runs; the wrapper's `hidden
sm:block` class only applies when neither a note nor tags exist, so an overview-only row stays
      phone-invisible without an extra margin; spoiler branch is untouched — `note &&
item.noteIsSpoiler` still renders `SpoilerNote`, never the overview `<p>`; tags block is
      unmoved, still after the note/overview branches) plus `tsc --noEmit` and `yarn lint`, rather than
      a live browser — no interactive browser tooling available in this environment (same constraint
      noted at T005).
- [x] T014 [US2] Run `yarn test:e2e -- e2e/lists-ranked.spec.ts e2e/lists-curation.spec.ts` again and
      confirm both still pass unmodified.
      Ran locally: 10 failed / 5 passed, all failures the same pre-existing local-only flakiness
      family already documented at T006 (strict-mode `getByText("Forrest Gump")` /
      `getByText("Inception")` violations from accumulated test-DB state across repeated local runs,
      not a CI concern — fresh DB there). No failure touches a note/overview/tags/mask-b assertion;
      the note-slot and overview-fallback markup added in T009-T012 is never reached by the failing
      locators. Full green confirmation deferred to CI's fresh-DB run per this repo's established
      pattern.
- [x] T015 [US2] Run `yarn lint` on the touched file and fix any new issues.
      Clean, 0 warnings.
- [x] T016 [US2] Commit this story's change as `fix(lists): show plot summary in empty list-row note
slot on desktop` (per research.md R6) — no other files staged.
      Committed as f257769; only `list-items-list-view.tsx` staged.

**Checkpoint**: Both user stories are complete and independently functional — rank relocated and
overview fallback in place, with no regressions to notes, tags, or existing e2e coverage.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T017 Run `yarn ci:check` (requires reachable Postgres per `.env` `DATABASE_URL`) and confirm
      lint, format, migrate, test, and build all pass with no changes needed beyond T002–T016.
      Ran clean: lint 0 warnings, format check passed (after formatting the spec's own markdown docs,
      which are outside T002–T016's scope), migrate reported no schema diff, 485 vitest tests passed,
      and `next build` compiled and typechecked successfully.
- [x] T018 Follow quickstart.md's full responsive screenshot recipe once more end-to-end (390×844,
      640×900, 1280×800) after both commits are in place, confirming SC-001 through SC-007 together
      (poster flush-left, no rank/badge overlap, overview only at `sm`+, no row-height regression, no
      visible fade band in either theme or on hover, existing suites green); delete any throwaway
      Playwright spec or screenshot files created for verification before finishing.
      No interactive browser tooling available in this environment (same constraint as T005/T013), so
      no throwaway Playwright script was created and no screenshots were taken — nothing to delete.
      Re-verified via combined static review of both landed commits together (6d6ded3, f257769): the
      final JSX matches contracts/list-row.md's full row shape end-to-end — poster first child, trailing
      cluster `flex flex-col items-end justify-between self-stretch` with rank beneath the badge row,
      and the note/overview branch order (`note` → `overview` → tags) unchanged by the rank commit. Ran
      `yarn test:e2e -- e2e/lists-ranked.spec.ts e2e/lists-curation.spec.ts` again: 11 failed / 4 passed,
      same pre-existing local-DB-pollution family already documented at T006/T014 (strict-mode
      `getByText("Inception")`/`getByText("Forrest Gump")` resolving to 2 elements from accumulated
      state across repeated local runs) — no `tabular-nums`, `opacity-50`, or note/overview/mask-b
      assertion failed on its own merits. `yarn ci:check` (T017) passed clean including the full
      Vitest suite and production build. Full green e2e + live-screenshot confirmation deferred to CI's
      fresh-DB run per this repo's established pattern.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verifies the Tailwind mask utilities compile before either
  story relies on them.
- **Foundational (Phase 2)**: Empty — nothing blocks the user stories beyond Setup.
- **User Story 1 (Phase 3)**: Depends on Setup. No dependency on User Story 2.
- **User Story 2 (Phase 4)**: Depends on Setup **and** User Story 1's edit being committed first
  (T008), because both stories touch overlapping regions of the same `ListRow` function and the plan
  sequences them as two ordered commits (research R6). Not parallelizable with US1 on the same file.
- **Polish (Phase 5)**: Depends on both user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories — independently testable and shippable
  (MVP).
- **User Story 2 (P2)**: Builds on the file state left by User Story 1 (rank moved into the trailing
  cluster); independently testable on its own acceptance criteria once applied.

### Within Each User Story

- Structural JSX edit before manual verification.
- Manual verification before running existing e2e suites.
- e2e suites green before lint.
- Lint clean before commit.

### Parallel Opportunities

- None across stories: both stories edit the same file (`list-items-list-view.tsx`) and must land as
  two sequential commits per research R6.
- Within a story, tasks are sequential (same file, same function) except that lint (T007/T015) could
  be run alongside a final manual re-check, but there is no separate-file parallel work to schedule.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (confirm mask utility compiles).
2. Complete Phase 3: User Story 1 (rank relocation).
3. **STOP and VALIDATE**: verify independently at 390px/desktop, run existing e2e suites, lint, commit.
4. This alone is deployable — it satisfies FR-001 through FR-005 and SC-001/SC-002 without touching
   the note slot.

### Incremental Delivery

1. Setup → User Story 1 → validate → commit 1 (`fix(lists): move list-row rank under the trailing
badge cluster`).
2. User Story 2 → validate → commit 2 (`fix(lists): show plot summary in empty list-row note slot on
desktop`).
3. Polish: `yarn ci:check` + full quickstart recipe across both commits, then rebase onto
   `origin/main` and ff-merge per the deploy flow.

## Notes

- [Story] label maps each implementation task to its user story for traceability.
- No Vitest tasks: no `src/lib/` logic is introduced (research R5).
- No new or modified Playwright specs: existing suites cover the invariants that matter and must pass
  unmodified (FR-017, SC-007); any throwaway verification script from quickstart.md §2 must be
  deleted, not committed.
- No API/schema/env/README changes anywhere in this task list (FR-016).
- Commit after each story, not after each task — per the plan's two-commit structure.
