# Feature Specification: List Row Layout — Rank Badge & Overview Fallback

**Feature Branch**: `014-list-row-layout`  
**Created**: 2026-09-20  
**Status**: Draft  
**Input**: User description: "Make the list-mode rows on the list detail page (src/app/(public)/lists/[slug]/list-items-list-view.tsx) use horizontal space better on phones and desktop. Two changes, both in that one component: 1. Rank number placement — move the rank from its own left-hand column to the bottom-right corner of the row, under the eye/hide icons in the trailing badge cluster; poster becomes the first element, flush left; rank stays readable and never overlaps the vote pill or comment badge at any width. 2. Plot summary fallback on desktop — when an item has no custom note, show the title's overview in the note slot at sm and above only, clamped to ~3 lines with a bottom fade (not a hard cut or ellipsis); notes win when present; spoiler notes keep their reveal behaviour; tags still render below. Constraints: no API/schema/data changes; follow docs/ui-ux-standards.md Responsive layout; keep row density; two fix(lists) commits; no Prisma migration; extend Playwright only if an existing list spec asserts on the rank column or note rendering."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Rank number moves out of the way on phones (Priority: P1)

A member opens a ranked list that is displayed in list mode on their phone. Today each row begins with a narrow rank column, so the poster is pushed right and the title/metadata block is squeezed. After this change the poster is the first thing in the row and sits flush against the left edge; the rank number is still visible on every row but lives in the bottom-right corner, tucked under the trailing cluster of badges (vote pill, comment count, hidden-eye, hide toggle). The same placement is used on desktop so the row reads identically at every width.

**Why this priority**: The rank column is the single largest waste of horizontal space on a ~390px screen and affects every ranked list in list mode. Reclaiming it directly improves title legibility on phones, which the project treats as a first-class surface.

**Independent Test**: Create a ranked list in list mode with three or more items, open it at phone width and at desktop width, and confirm (a) the poster is the leftmost element of every row, (b) each row shows its rank number in the bottom-right corner, (c) the rank never overlaps the vote pill or comment badge, and (d) the page does not scroll horizontally.

**Acceptance Scenarios**:

1. **Given** a ranked list in list mode viewed at ~390px, **When** the rows render, **Then** each poster is the first element in its row with no rank column to its left, and the title block starts immediately after the poster.
2. **Given** a ranked list in list mode, **When** a row renders at any breakpoint (phone, the breakpoint just above where the layout changes, and desktop), **Then** the rank number appears in the bottom-right corner of the row, beneath the badge cluster, using the same readable styling as today (small, bold, muted, tabular digits).
3. **Given** a row that has a vote pill and a comment-count badge, **When** viewed at any width, **Then** the rank number does not overlap or touch either badge.
4. **Given** a row whose badge cluster is empty (viewer role, no votes, no comments, not hidden), **When** ranking is enabled, **Then** the rank number is still shown in the bottom-right corner.
5. **Given** a list with ranking disabled, **When** rows render, **Then** no rank number is shown anywhere in the row (unchanged from today).
6. **Given** a hidden (faded) item on a ranked list, **When** the row renders, **Then** the rank number is still present and shares the row's faded appearance, exactly as the existing rank did.
7. **Given** a ranked list in list mode, **When** existing automated checks that look for a visible rank number run, **Then** they still pass without modification.

---

### User Story 2 - Plot summary fills the empty note slot on desktop (Priority: P2)

A member browses a list in list mode on a desktop or tablet. Many items have no curator note, leaving the wide note column blank. After this change, items without a note show the title's plot summary in that slot instead, so the row is informative at a glance. The summary is visually limited to roughly three lines and fades out toward the bottom rather than being cut off abruptly or ending in "…", so long summaries never make the row taller. On phones the summary is not shown at all, keeping rows short.

**Why this priority**: This is a content-richness improvement rather than a layout fix; it delivers value on its own but the rank change is the higher-impact usability fix.

**Independent Test**: Open a list in list mode containing (a) an item with a note, (b) an item with no note but a long plot summary, and (c) an item with no note and no summary. At desktop width confirm (a) shows the note, (b) shows a faded ~3-line summary, (c) shows nothing in the slot. At phone width confirm (b) shows no summary.

**Acceptance Scenarios**:

1. **Given** an item with no curator note and a plot summary available, **When** the row renders at the small breakpoint and above, **Then** the plot summary appears in the note slot in small muted text.
2. **Given** an item with no curator note and a long plot summary, **When** the row renders at desktop width, **Then** the visible summary is capped at roughly three lines, the overflow fades to transparent at the bottom (no hard cut, no ellipsis), and the row is no taller than a row whose note slot is empty.
3. **Given** an item with no curator note, **When** the row renders at phone width (below the small breakpoint), **Then** no plot summary is shown and the row is the same height as today.
4. **Given** an item that has a curator note, **When** the row renders at any width, **Then** the note is shown exactly as today and the plot summary is not shown.
5. **Given** an item whose note is marked as a spoiler, **When** the row renders, **Then** the existing "Spoiler — reveal" control appears and behaves as today; the plot summary is not shown as a substitute.
6. **Given** an item with no note and no plot summary, **When** the row renders, **Then** the note slot is empty (tags still render if present).
7. **Given** an item with no note, a plot summary, and tags, **When** the row renders at desktop width, **Then** the tags appear below the faded summary, in the same position they occupy below a note today.
8. **Given** the app in dark theme, **When** a faded summary renders, **Then** the fade blends into the row's background with no visible light or dark band; the same holds in light theme and when the row is hovered.

---

### Edge Cases

- **Empty or whitespace-only note**: treated as "no note" — the plot summary fallback applies.
- **Empty or whitespace-only plot summary**: treated as "no summary" — the slot stays empty.
- **Very short plot summary (one line)**: rendered in full with no visible fade artefact.
- **Row with vote pill + comment badge + hidden-eye + hide toggle** (the widest badge cluster): rank number still fits beneath without overlapping, at ~390px.
- **Two-digit and three-digit ranks** (e.g. 10, 100): still fit in the corner and remain legible.
- **Long title wrapping to two lines on a phone**: the reclaimed rank column width goes to the title block; the rank in the corner does not overlap the title or metadata.
- **Hovered row**: the fade on the summary matches the hover background so no rectangular band appears.
- **Ranking toggled on/off in list settings**: the rank number appears/disappears in the corner with no change to the rest of the row layout.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: In list mode, the poster MUST be the first element of every row, positioned flush against the row's left padding; the left-hand rank column MUST be removed entirely.
- **FR-002**: When ranking is enabled, each row MUST display its rank number in the bottom-right corner of the row, beneath the trailing badge cluster, at every breakpoint.
- **FR-003**: The rank number MUST keep its current readable presentation (small, bold, muted colour, tabular digits) and MUST NOT overlap the vote pill, comment badge, hidden-eye icon, or hide toggle at any viewport width from ~390px to desktop.
- **FR-004**: When ranking is disabled, no rank number MUST be shown (unchanged).
- **FR-005**: The rank number MUST still be present for hidden (faded) items and MUST inherit the row's faded appearance.
- **FR-006**: When an item has no curator note (absent, empty, or whitespace-only) and a non-empty plot summary is available, the row MUST show that plot summary in the note slot at the small breakpoint and above.
- **FR-007**: The plot summary MUST NOT be shown below the small breakpoint (phone width).
- **FR-008**: The plot summary MUST be visually capped at approximately three lines with the overflow fading to transparent at the bottom; a hard cut or trailing ellipsis MUST NOT be used.
- **FR-009**: The fade MUST match the row background in both light and dark themes and in the row's hover state, so no visible band appears.
- **FR-010**: The plot summary MUST use the same small muted text treatment as the row's metadata line.
- **FR-011**: When an item has a curator note, the note MUST render exactly as today and the plot summary MUST NOT be shown.
- **FR-012**: Spoiler notes MUST keep their existing "Spoiler — reveal" behaviour; the plot summary MUST NOT be shown in place of an unrevealed spoiler.
- **FR-013**: Tags MUST continue to render below the note slot content (note or plot summary) in their current position and styling.
- **FR-014**: Row density MUST be preserved: same row padding and corner radius, same poster size (64×96), and a row showing a faded summary MUST NOT be taller than a row with an empty note slot.
- **FR-015**: The list page MUST NOT scroll horizontally at ~390px after these changes.
- **FR-016**: No API, schema, database, or data-shape changes are permitted; the plot summary is already delivered to the list page.
- **FR-017**: Existing automated list-page checks MUST continue to pass; they may be modified only where they assert on the removed rank column's position or on note rendering.

### Key Entities

- **List item row**: One entry in list mode. Displays poster, title, year/type/country line, added-by attribution, note slot (note → plot summary → empty), tags, badge cluster, and (when ranking is on) rank number.
- **Rank number**: The item's display position within a ranked list; already computed and delivered to the row.
- **Curator note**: Optional free-text note attached by a list member, optionally flagged as spoiler.
- **Plot summary**: The title's overview text, already part of the data delivered to each row; may be absent.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On a ~390px phone, the title block of a ranked list row gains the full width previously occupied by the rank column (the poster's left edge aligns with the row's left padding on 100% of ranked rows).
- **SC-002**: At ~390px, the breakpoint just above where the layout changes, and desktop width, 0 rows show the rank number overlapping any badge, and the page's horizontal scroll width equals the viewport width.
- **SC-003**: At desktop width, 100% of items without a note but with a plot summary show a faded summary; 0 of those rows are taller than a note-less row without a summary.
- **SC-004**: At ~390px, 0 rows show a plot summary.
- **SC-005**: In both light and dark themes (including hover), the summary fade produces no visible band against the row background on visual inspection.
- **SC-006**: Rows with notes, spoiler notes, and tags render identically to today (no regressions in note text, reveal control, or tag chips).
- **SC-007**: The existing Playwright list suites pass with no new failures.

## Assumptions

- The list detail page in list mode is the only surface affected; grid mode, the item detail modal, and other list sub-pages are out of scope.
- "Roughly three lines" means the visible region is sized to about three lines of the small text size; exact pixel height is a planning decision.
- The rank's corner position anchors to the row itself (not the poster), since it is meant to sit beneath the trailing badge cluster on the right, opposite the poster; this is a deliberate exception to the "overlays anchor to the poster" guidance, agreed in the request.
- Whitespace-only notes and summaries are treated as absent.
- The two changes ship as two separate `fix(lists)` commits (rank placement; overview fallback), per the request and the project's Conventional Commits rule.
- No new Prisma migration, no new environment variables, and no README changes are needed.
- Playwright coverage is extended only if an existing list spec asserts on the rank column's position or on note rendering; the current rank-visibility check (a visible tabular-digit rank) is expected to keep passing as-is.
- Verification follows the Responsive layout recipe in `docs/ui-ux-standards.md`: screenshot at 390px and desktop, assert no horizontal overflow.
