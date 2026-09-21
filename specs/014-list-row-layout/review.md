# Review: List Row Layout — Rank Badge & Overview Fallback

Reviewed 65 file(s) changed across 4 commit(s), against 090eec6...HEAD (merge-base with `origin/main`).
Read in full: `src/app/(public)/lists/[slug]/list-items-list-view.tsx` (the only application file in
the diff; both `fix(lists)` commits, 6d6ded3 and f257769, touch it and nothing else), `spec.md`,
`plan.md`, `tasks.md`, `research.md`, `data-model.md`, `contracts/list-row.md`, `quickstart.md`,
`e2e/lists-ranked.spec.ts`, `e2e/lists-curation.spec.ts` (the DOM hooks the contract promises to
preserve), `e2e/global-setup.ts`, `playwright.config.ts`, `.github/workflows/ci.yml` (e2e job),
`docs/dev/e2e-tests.md`. Sampled: `src/app/(public)/lists/[slug]/list-item-reorder.tsx` (the only
consumer of `ListItemsListView`), `src/app/(public)/lists/[slug]/page.tsx` and `list-items-grid.tsx`
(`mediaItem.overview` plumbing), `src/app/globals.css` (theme variables), the compiled Tailwind
output in `.next/static/chunks/*.css` (mask utilities). Not reviewed: the 63 spec-kit scaffold files
under `.claude/skills/speckit-*`, `.specify/` and `.prettierignore` from commits e5c6fea / 522ef37 —
they are a vendored tooling upgrade unrelated to this feature; I confirmed via `--stat` that they
touch no application code.

Note for the merger: the feature artifacts (`specs/014-list-row-layout/*`) are untracked in the
working tree — nothing in the four commits adds them. That is a pipeline/commit-phase matter, not a
code defect, but the branch as it stands carries the code without its spec.

## Verdict

The work satisfies the spec and hangs together. Both user stories are implemented exactly as the
plan and `contracts/list-row.md` describe, in two single-file `fix(lists)` commits in the planned
order, with no API/schema/data change. I verified the behaviour in a real browser against the
production build (not just by reading): at 390 / 640 / 1280 px the poster is the first, flush-left
child, the rank sits at the bottom-right padding edge in normal flow ≥ 57 px below the badge row
(so it cannot overlap), the overview renders only from `sm` up, is capped at 48 px with a
`mask-image` fade and no ellipsis, tags sit 4 px below it, notes and spoiler notes win over it, a
whitespace-only note is treated as absent, the hidden row fades rank and all, an empty badge row
(VIEWER) still shows the rank, and `scrollWidth === clientWidth` at every width. Lint, Prettier,
`tsc --noEmit` and the 485-test Vitest suite are clean at HEAD. There are no blocking findings. The
one real defect is in the record, not the code: `tasks.md` closes T006/T014/T018 on the premise that
CI will confirm the two Playwright list suites green, and CI does not run those suites at all — I
ran them myself and attribute every failure to pre-existing, documented causes (details in F1).
Ready for a human to merge.

## Findings

- [ ] MINOR F1 — `tasks.md` records e2e/visual verification that rests on false premises; the
      underlying requirement (FR-017 / SC-007, "no new failures") holds but was never actually shown
      by the implement pass.
      where: specs/014-list-row-layout/tasks.md:102, specs/014-list-row-layout/tasks.md:173,
      specs/014-list-row-layout/tasks.md:209, specs/014-list-row-layout/tasks.md:91,
      specs/014-list-row-layout/tasks.md:198, .github/workflows/ci.yml:177,
      docs/dev/e2e-tests.md:84
      why: Three ticked tasks defer "full green confirmation" to "CI's fresh-DB run", but the CI
      e2e job runs a fixed allow-list of nine specs (`.github/workflows/ci.yml:177-186`) and
      `lists-ranked` / `lists-curation` are explicitly excluded as pre-existing red
      (`docs/dev/e2e-tests.md:84-85`). No CI run will ever confirm them. The notes also
      attribute the local failures to "accumulated test-DB state"; running both suites at
      HEAD (3 failed / 3 passed and 7 failed / 2 passed) shows every failure is a Playwright
      strict-mode violation on `getByText(<title>)` whose duplicates are either (a) the
      pre-existing poster-fallback `<span>` at
      `src/app/(public)/lists/[slug]/list-items-list-view.tsx:93` plus the title `<p>` at
      `:105` — rows seeded without a poster — or (b) a transient second copy of a
      page-level element (even the empty-state text "Every item on this list is hidden."
      duplicates), i.e. a streaming/hydration race unrelated to `ListRow`. None involve the
      new overview `<p>` (`:150`), the relocated rank `<span>` (`:218`), `opacity-50` or the
      hide toggle, so the change adds no failure mode — but that is my analysis, not the
      record's. Finally, T005/T013/T018 say "no interactive browser tooling available";
      Playwright + Chromium are installed and work headless (I used them for the checks
      above), so the quickstart recipe could have been run.
      owed: Nothing in code. The next person reading `tasks.md` should know the e2e gate for this
      feature is local-only and currently red for reasons predating it; if the project
      wants the rank-visibility check (`e2e/lists-ranked.spec.ts:119`) to actually guard
      this row, the strict-mode `getByText` calls at `e2e/lists-ranked.spec.ts:51,116` and
      `e2e/lists-curation.spec.ts:60` need `exact`/role scoping — which is the separate
      repair work `docs/dev/e2e-tests.md` already describes.
      traces: FR-017, SC-007, User Story 1 acceptance 7

- NOTE F2 — An overview that is exactly three lines with no overflow still renders its third line
  faded (`mask-b-from-8 mask-b-to-12` fades 32→48 px regardless of overflow). Documented and
  accepted in `specs/014-list-row-layout/research.md:132`; one- and two-line summaries are fully
  opaque (measured: a 2-line overview at 1280 px has `height: 32px`, inside the opaque region). FR-008
  only requires the fade when there is overflow, so this is within spec, but it is the one visible
  artefact a user might notice on short summaries at wide columns.

- NOTE F3 — The overview fallback (FR-006…FR-014) has zero automated coverage, and the only automated
  hook for the rank (`[class*="tabular-nums"]`, `e2e/lists-ranked.spec.ts:119`) lives in a suite CI
  does not run and that fails locally before reaching that assertion. This is by design — the spec
  scoped Playwright changes out (FR-017, Assumptions) and the plan cites Constitution V — so it is
  not a defect, but the feature is guarded only by manual/visual checks. The
  `contracts/list-row.md:59` claim that `lists-curation.spec.ts` relies on the title `<p>` nesting
  depth is also slightly off: the `text=Fight Club / .. / ..` walk at
  `e2e/lists-curation.spec.ts:65-67` lands on the content column, which never contained the hide
  toggle before or after this change (the test fails earlier anyway).

- NOTE F4 — `src/app/(public)/lists/[slug]/list-items-list-view.tsx:143` and `:146` pass
  `item.notes!`; `note` (`:67`) is the identical untrimmed string whenever that branch runs, so
  `notes={note}` / `content={note}` would drop the two non-null assertions with no behaviour change.
  Cosmetic; lint accepts the current form.

## Coverage

| Checked                                                                                          | Count | Satisfied | Partial    | Absent | Contradicted |
| ------------------------------------------------------------------------------------------------ | ----- | --------- | ---------- | ------ | ------------ |
| Functional requirements (FR-001…FR-017)                                                          | 17    | 16        | 1 (FR-017) | 0      | 0            |
| Success criteria (SC-001…SC-007)                                                                 | 7     | 6         | 1 (SC-007) | 0      | 0            |
| User Story 1 acceptance scenarios                                                                | 7     | 6         | 1 (1.7)    | 0      | 0            |
| User Story 2 acceptance scenarios                                                                | 8     | 8         | 0          | 0      | 0            |
| Edge cases                                                                                       | 8     | 8         | 0          | 0      | 0            |
| Plan design points (R1 rank column, R2 precedence, R3 breakpoint, R4 fade, R5 tests, R6 commits) | 6     | 6         | 0          | 0      | 0            |
| Contract DOM hooks (`tabular-nums`, `opacity-50`, aria-labels, title depth, `stopPropagation`)   | 5     | 5         | 0          | 0      | 0            |
| Constitution principles (I–V)                                                                    | 5     | 5         | 0          | 0      | 0            |

How each row was checked:

- **FR-001 / SC-001** — rank column deleted (diff removes the `div.w-7` block); poster is the first
  child at `list-items-list-view.tsx:82`; measured `poster.x = row.x + 12` on every row at 390, 640
  and 1280 px.
- **FR-002 / FR-003 / SC-002** — trailing cluster is `flex flex-col items-end justify-between
self-stretch` (`:176`) with the rank after the badge row (`:217-221`); measured rank
  `right = row.right − 12`, `bottom = row.bottom − 12`, and `rank.y − badges.bottom ≥ 57 px` at all
  three widths, with a comment badge + hide toggle and with the hidden-eye + toggle;
  `document.documentElement.scrollWidth === clientWidth` at 390 / 640 / 1280.
- **FR-004** — `rankingEnabled && item.displayRank !== undefined` guard unchanged (`:217`).
- **FR-005** — row keeps `opacity-50` (`:77`); hidden Matrix row measured faded with rank present.
- **FR-006 / FR-011 / FR-012 / edge "whitespace note"** — `note` / `overview` derivation at
  `:67-71`; branch order note → overview → tags at `:141-153`; verified live: noted row shows note
  only, spoiler row shows the "Spoiler — reveal" button only, whitespace-note row (`"   "`) shows
  the empty slot, note-less rows show the overview.
- **FR-007 / SC-004 / acceptance 2.3** — overview `<p>` is `hidden sm:block` (`:150`) and an
  overview-only wrapper is `hidden sm:block` (`:138`); measured `display: none`, height 0, row
  height 120 px at 390 px.
- **FR-008 / FR-010 / FR-014 / SC-003** — compiled CSS: `.max-h-12{max-height:48px}`,
  `.text-xs{line-height:16px}`, `--tw-mask-bottom: linear-gradient(to bottom, black 32px,
transparent 48px)`; measured a 392-char overview at 1280 px: `height 48`, `scrollHeight 64`
  (clipped, no ellipsis), row height still 120 px = poster 96 + `p-3`; `p-3 rounded-lg` and
  `w-16 h-24` unchanged at `:76` / `:82`.
- **FR-009 / SC-005 / acceptance 2.8 / edge "hovered row"** — fade is `mask-image` on the text
  itself, so it is background-independent by construction; hovered row screenshot at 1280 px shows
  no band. `globals.css` defines a single `:root` theme (no `.dark` / `prefers-color-scheme`), so
  "light and dark" collapses to one case.
- **FR-013 / acceptance 2.7** — tags block unchanged at `:154-170`, after the overview; measured
  tags `y = overview.bottom + 4` (`mt-1`) at 1280 px and tags visible under the title at 390 px.
- **FR-015** — `scrollWidth` equals viewport at all three widths (above).
- **FR-016** — diff touches one client component; `GridItem.mediaItem.overview` already typed
  (`list-items-grid.tsx:35`) and populated (`page.tsx:142`).
- **FR-017 / SC-007 / acceptance 1.7** — partial; see F1. `[class*="tabular-nums"]` survives on the
  rank (`:218`), `opacity-50` on the row root, `aria-label` on `ListItemHideToggle`, `stopPropagation`
  on the vote-pill wrapper (`:179`) and spoiler button (`:37`) all preserved.
- **Acceptance 1.4 / edge "empty badge cluster"** — logged in as a VIEWER (no hide toggle, no
  comments, not hidden): badge row has 0 children and the rank still renders bottom-right at 390
  and 1280 px.
- **Edge "widest cluster"** — cannot occur on a ranked list: `POST /api/lists` rejects
  `rankingEnabled && votingEnabled` (`src/app/api/lists/route.ts:116-118`); the in-flow column
  handles it regardless.
- **Edge "two/three-digit ranks", "long title"** — by construction (column width is
  `max(badges, rank)`, title column is `min-w-0`); a 2-line title at 390 px measured clear of the
  badge row. Not measured with 100+ items.
- **Constitution I–V** — no data fetching or routes added (I, II); no schema (III); two ordered
  single-concern `fix(lists)` commits with the planned messages, scaffold commits separate (IV);
  `yarn lint`, `yarn format:check`, `tsc --noEmit`, `yarn test` (485 passed) run clean at HEAD, and
  `.next/BUILD_ID` post-dates the last commit, corroborating T017's build (V).
- **Cross-pass coherence** — single file, one `note`/`overview` vocabulary shared by both commits,
  commit 1 contains no overview code and commit 2 no rank code; the landed JSX matches
  `contracts/list-row.md` element-for-element and class-for-class. No duplicated helpers, no
  interface drift.

## What I could not check

- A genuinely green run of `e2e/lists-ranked.spec.ts` / `e2e/lists-curation.spec.ts` on any
  database: they are red at HEAD for pre-existing reasons and excluded from CI, so "no new failures"
  is established by reading each failure's duplicate elements, not by a green-vs-green comparison. I
  did not build and run the baseline commit side-by-side (it would have meant temporarily checking
  out pre-feature code, which is outside this phase's write scope).
- The exact-three-line overview case (F2) and 100+-item ranks were reasoned from the compiled CSS,
  not rendered.
- Real-device rendering (touch, iOS Safari `-webkit-mask-image`) — checks were headless Chromium at
  390 / 640 / 1280 px with `isMobile` for 390.
- A light theme: the app ships only one (dark) theme, so FR-009's light-theme clause has nothing to
  render against today.
- Toggling ranking off in list settings live; verified only by the unchanged guard at `:217`.
