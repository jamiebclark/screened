# Feature Specification: List Item Curation (hide, tags, stats)

**Feature Branch**: `010-list-item-curation`  
**Created**: 2026-09-06  
**Status**: Draft  
**Input**: User description: "Add three related capabilities to collaborative lists (/lists/<slug>). Build them in this order, since the third depends on the first two. 1. HIDE / DE-ACTIVATE A LIST ITEM — per-item toggle to hide (de-activate) an item in a list, using an eye icon to carry the toggle affordance. DECIDED: hidden state is PER-LIST and SHARED BY ALL MEMBERS — a single boolean column on ListItem. It is NOT per-viewer. Do not add a per-user join table, and do not filter by viewer identity in the read path. A hidden item still renders, but faded/de-emphasised. The user can filter hidden items out of the view entirely. Respect existing ListMember roles for who may toggle hidden state. 2. TAGS ON LIST ITEMS — free-text tags on list items, with autocomplete while typing. Tag vocabulary is LOCALIZED PER LIST — suggestions come from tags already used within that same list, not globally across the account or across other lists. 3. STATS BREAKOUT FOR A LIST — four figures: total item count; non-hidden item count; how many distinct decades the list spans (by release year); and how many distinct tags appear among the NON-HIDDEN items only. Does not need to be visible at all times — a modal or a dedicated sub-page is fine, but it must be easy to reach from the list page. CONSTRAINTS: requires a Prisma schema change and migration (migrations only, never `prisma db push`); any new Prisma enum needed by client components must be mirrored as plain const objects following src/lib/notification-types.ts; follow docs/ui-ux-standards.md for all visible changes; unit-test new pure logic in src/lib/ with Vitest and extend Playwright coverage for the hide-toggle, tagging and stats journeys; ranked list ordering was just fixed in specs/009-fix-list-management — do not reintroduce read-path partitioning of list items, reuse orderListItems() from src/lib/list-item-ordering.ts."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - De-activating an item without deleting it (Priority: P1)

A member of a collaborative list decides a title no longer belongs in active consideration — it was
already watched by the group, it turned out to be unavailable, or it lost the vote — but nobody wants
to lose the record of it having been suggested. They click an eye icon on the item and the item
becomes de-emphasised for everybody looking at the list. When they want a clean view, they switch on
a filter that removes hidden items from the page entirely.

**Why this priority**: Today the only way to take an item out of contention is to delete it, which
destroys its notes, votes and comments and erases the fact that it was ever considered. Hiding is the
non-destructive alternative, and the stats breakout (Story 3) is meaningless without it.

**Independent Test**: Open a list with several items, hide one, confirm it renders faded for the
current user and for a second member in another session, then switch on the filter and confirm the
hidden item disappears from the page while the visible items stay in their existing order.

**Acceptance Scenarios**:

1. **Given** a list with items A, B, C and no hidden items, **When** a member with edit rights
   activates the eye toggle on B, **Then** B remains in place in the list but renders faded and
   de-emphasised, and the toggle reads as "hidden".
2. **Given** item B is hidden, **When** a different member of the same list opens the list in their
   own session, **Then** B renders faded for them too — hidden state is a property of the list, not
   of the viewer.
3. **Given** item B is hidden, **When** any viewer switches on the "hide hidden items" filter,
   **Then** B is removed from the page entirely and A and C remain, in the same relative order they
   had before the filter was applied.
4. **Given** the filter is switched on, **When** the viewer reloads the page or shares the page URL
   with another member, **Then** the filter is still applied, because the filter state travels in the
   page address rather than being stored against the account.
5. **Given** item B is hidden, **When** a member with edit rights activates the eye toggle on B
   again, **Then** B returns to normal emphasis for every member, and its notes, votes, comments and
   ranked position are exactly as they were before it was hidden.
6. **Given** a member whose role on the list is view-only, **When** they open the list, **Then** no
   eye toggle is offered on any item, but they can still see which items are hidden and can still use
   the filter.
7. **Given** a hide or unhide request fails, **When** the failure occurs, **Then** the item returns
   to its previous appearance and the user sees a plain-language error message with no technical
   detail.
8. **Given** a ranked list, **When** items are hidden, **Then** the ranks shown against the visible
   items are unchanged — a hidden item keeps its rank and hiding it does not renumber anything.

---

### User Story 2 - Tagging items with a vocabulary that grows per list (Priority: P2)

Members annotate items with short free-text tags of their own invention — "halloween", "rewatch",
"cheap laughs", "needs subtitles". As they type a tag on a new item, the list suggests tags already
used elsewhere in that same list, so the group converges on shared language instead of accumulating
near-duplicates. Tags used on other lists, including the member's own other lists, never leak into
the suggestions.

**Why this priority**: Tags are the second half of the curation story and supply one of the four
stats figures. They are valuable on their own, but hiding is the more urgent gap, so tags land
second.

**Independent Test**: Open a list, add two tags to one item, then start typing on a second item and
confirm the existing tags are offered as suggestions. Open a different list and confirm none of the
first list's tags are suggested there.

**Acceptance Scenarios**:

1. **Given** an item with no tags, **When** a member with edit rights types a tag and confirms it,
   **Then** the tag appears on that item for every member of the list.
2. **Given** the tag "halloween" is already used on some item in the list, **When** a member starts
   typing "hal" into the tag field on any item in that list, **Then** "halloween" is offered as a
   suggestion and can be accepted without retyping it.
3. **Given** the tag "halloween" exists only on list X, **When** a member types "hal" on an item in
   list Y, **Then** no suggestion is offered from list X, even though the same member belongs to both
   lists.
4. **Given** an item already carries the tag "halloween", **When** a member enters "Halloween" or
   " halloween " on that same item, **Then** no duplicate tag is created and the item still shows one
   halloween tag.
5. **Given** an item with tags, **When** a member with edit rights removes a tag from the item,
   **Then** the tag disappears from that item, and if no other item in the list still uses it, it
   stops being offered as a suggestion in that list.
6. **Given** a member whose role on the list is view-only, **When** they open the list, **Then** they
   can read every item's tags but cannot add or remove any.
7. **Given** a member enters a tag that is empty, whitespace only, or longer than the allowed length,
   **When** they try to confirm it, **Then** the tag is rejected with a plain-language message and
   nothing is saved.
8. **Given** an item that is hidden, **When** a member with edit rights views it, **Then** they can
   still read and edit its tags.

---

### User Story 3 - Reading a list's shape at a glance (Priority: P3)

A member wants to understand the list as a whole rather than item by item: how big it is, how much of
it is still in play, how far its taste ranges across eras, and how much shared vocabulary the group
has built. They open a stats breakout from the list page and see four figures.

**Why this priority**: This is a read-only summary that depends on both preceding stories — the
non-hidden count needs hiding, and the tag count needs tags. It ships last and is the smallest slice.

**Independent Test**: Open a list with a known mix of items, hidden items, release years and tags,
open the stats breakout from the list page, and confirm all four figures match a hand count.

**Acceptance Scenarios**:

1. **Given** a list with 12 items, 3 of them hidden, **When** a member opens the stats breakout,
   **Then** it shows a total item count of 12 and a non-hidden item count of 9.
2. **Given** a list whose items have release years 1985, 1989, 1994 and 2001, **When** a member opens
   the stats breakout, **Then** the decades figure is 3 (the 1980s, the 1990s and the 2000s).
3. **Given** a list where some items have no known release year, **When** a member opens the stats
   breakout, **Then** those items do not contribute a decade, and the decades figure counts only the
   decades that are actually known.
4. **Given** a list where the tag "rewatch" appears only on hidden items and the tags "noir" and
   "rewatch" both appear on visible items, **When** a member opens the stats breakout, **Then** the
   distinct-tag figure counts only tags present on non-hidden items.
5. **Given** any list the member can view, **When** they look at the list page, **Then** there is a
   clearly labelled way to reach the stats breakout without scrolling past the list contents, and it
   opens without leaving useful context behind.
6. **Given** an empty list, **When** a member opens the stats breakout, **Then** all four figures
   read zero and the breakout explains that there is nothing to summarise yet rather than showing
   blank space.
7. **Given** a member with any role including view-only, **When** they open the stats breakout,
   **Then** they see the same four figures — stats are read-only for everyone.

---

### Edge Cases

- **Every item hidden, filter on**: the list body shows an empty state that explains all items are
  hidden and offers a way to switch the filter back off, rather than looking like an empty list.
- **Hiding the item currently being reordered**: while the "hide hidden items" filter is active,
  drag-to-reorder is not offered, because the sequence on screen is not the full sequence being
  saved. The page says why in one short line.
- **Concurrent toggles**: two members toggle the same item's hidden state at nearly the same moment.
  The last write wins and both members converge on the same state once their pages next load data;
  no error is surfaced for a no-op toggle.
- **Item cap interaction**: hidden items still count towards a list's item cap. Hiding is not a way
  to make room for more items.
- **Deleting an item that carries tags**: its tags go with it, and any tag that no other item uses
  leaves the list's suggestion vocabulary.
- **Tag entered with separators**: pasting "noir, rewatch" into the tag field yields two tags rather
  than one tag containing a comma.
- **Very long tag or very many tags on one item**: rejected at the documented limits with a
  plain-language message; existing tags on the item are untouched.
- **Hidden state on a public list viewed by a non-member**: a non-member with read access to a public
  list sees hidden items faded and can use the filter, but is offered no toggle.
- **Unranked (grouped) lists**: hiding does not move an item between the existing groups; a hidden
  movie stays with the movies.
- **Casing drift in the vocabulary**: "Noir" used on one item and "noir" on another are the same tag
  for suggestions and for the distinct-tag figure.

## Requirements _(mandatory)_

### Functional Requirements

**Hiding items**

- **FR-001**: Every list item MUST carry a single hidden/not-hidden state that belongs to the list and
  is identical for every person who views that list. It MUST NOT vary by viewer.
- **FR-002**: The list page MUST offer an eye icon on each item that toggles that item's hidden state,
  for members whose role permits editing the list's contents.
- **FR-003**: Members whose role does not permit editing list contents MUST NOT be offered the toggle,
  and a toggle request from them MUST be refused.
- **FR-004**: A hidden item MUST still render in the list by default, visually faded and
  de-emphasised, and MUST be distinguishable from a non-hidden item without hovering or clicking.
- **FR-005**: The list page MUST offer a control that removes hidden items from the view entirely, and
  the state of that control MUST survive a page reload and MUST be reproducible by sharing the page
  address.
- **FR-006**: Hiding or unhiding an item MUST NOT alter its notes, votes, comments, ranked position,
  date added, or its membership of the list.
- **FR-007**: Hidden items MUST remain part of the single ordered sequence the list already produces;
  the list MUST NOT be presented as separate hidden and non-hidden sections, and the ranks of the
  remaining items MUST NOT be renumbered when hidden items are filtered out of the view.
- **FR-008**: While hidden items are being filtered out of the view, reordering affordances MUST NOT
  be offered, and the page MUST state briefly why.
- **FR-009**: A failed toggle MUST restore the item's previous appearance and show a user-safe
  message.

**Tagging items**

- **FR-010**: Members whose role permits editing list contents MUST be able to add free-text tags to
  any item in that list and remove tags from any item in that list.
- **FR-011**: Tags MUST be visible to every person who can view the list, including view-only members
  and, for a public list, non-members.
- **FR-012**: While a tag is being typed, the system MUST suggest matching tags that are already in
  use on items **within the same list**, and MUST NOT suggest tags drawn from any other list or from
  the member's account at large.
- **FR-013**: Tag matching, de-duplication and counting MUST be case-insensitive and MUST ignore
  leading, trailing and repeated internal whitespace.
- **FR-014**: The same tag MUST NOT appear twice on one item.
- **FR-015**: Tag input MUST reject empty, whitespace-only and over-length values with a
  plain-language message, and MUST cap the number of tags on a single item, with the limits stated in
  the interface before the user hits them.
- **FR-016**: When a tag stops being used by any item in a list, it MUST stop being suggested in that
  list.
- **FR-017**: Tags MUST be editable on hidden items as well as visible ones.
- **FR-018**: Removing an item from a list MUST remove that item's tags.

**Stats breakout**

- **FR-019**: The list page MUST offer a clearly labelled, easy-to-reach way to open a stats breakout
  for that list, available to every member who can view the list.
- **FR-020**: The stats breakout MUST show exactly these four figures, each labelled in plain
  language: total number of items; number of non-hidden items; number of distinct decades the list
  spans by release year; number of distinct tags in use on non-hidden items.
- **FR-021**: The decades figure MUST count distinct decades across all items in the list, and MUST
  exclude items whose release year is unknown.
- **FR-022**: The distinct-tag figure MUST count only tags present on non-hidden items.
- **FR-023**: The stats breakout MUST render sensible zeros and an explanatory empty state for a list
  with no items.
- **FR-024**: The stats breakout MUST be read-only; it MUST NOT offer any way to change the list.

**Cross-cutting**

- **FR-025**: All three capabilities MUST honour the list's existing access rules — a person who
  cannot view a list MUST NOT be able to read its tags, hidden state or stats.
- **FR-026**: Hidden items MUST continue to count towards a list's item cap.
- **FR-027**: All visible changes MUST follow the project's UI/UX standards for section headings,
  card-versus-list density, and loading, empty and error states.

### Key Entities

- **List item hidden state**: one shared true/false flag per list item, defaulting to not hidden.
  Owned by the item, not by any viewer. No per-viewer record exists.
- **List item tag**: a short free-text label attached to one item of one list. Its comparison form is
  case-insensitive and whitespace-normalised. A tag has no existence independent of the items using
  it, and its scope for suggestion purposes is the single list.
- **List stats summary**: four derived figures computed from a list's items, their hidden state, their
  release years and their tags. Nothing is stored; the summary is always computed from current data.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A member can take an item out of active consideration, and confirm every other member
  sees it that way, in under 10 seconds and a single click, with no data lost.
- **SC-002**: 100% of hide/unhide actions are reflected identically for all members of the list on
  their next view of the page — no case in which two members disagree about whether an item is hidden.
- **SC-003**: A member can produce a clean view containing only items still in play in one click, and
  return to the full view in one click.
- **SC-004**: When adding a tag that already exists somewhere in the same list, a member can accept it
  from suggestions after typing at most three characters, in at least 95% of attempts.
- **SC-005**: Zero tags from other lists appear in a list's suggestions, verified across at least two
  lists owned by the same member.
- **SC-006**: All four stats figures match an independent hand count for a list containing hidden
  items, items with unknown release years, and tags used only on hidden items.
- **SC-007**: The stats breakout is reachable from the list page in one action, without scrolling past
  the list's items.
- **SC-008**: Ranked lists show the same order and the same rank numbers before and after items are
  hidden, and after the hidden-item filter is switched on and off.
- **SC-009**: Each of the three journeys — hiding, tagging, opening the stats breakout — is
  demonstrable end to end on a real list, and every stats figure is verified against a hand-counted
  example that includes hidden items, items with unknown release years, and tags used only on hidden
  items.

## Assumptions

These are reasonable defaults chosen where the request did not specify. Each can be overturned during
clarification or planning without reshaping the feature.

- **Who may hide and tag**: the list's existing member roles govern it — owners and contributors may
  toggle hidden state and edit tags on **any** item in the list; view-only members may not. This is a
  deliberate divergence from the existing per-item notes rule, which restricts editing to the list
  owner or the member who added the item: hidden state and tags are shared list-level curation, so
  restricting them to the original adder would leave items un-curatable once that member stops
  participating. Flag for confirmation.
- **Default view**: hidden items are shown faded by default and the filter is opt-in, so a member
  never silently loses sight of part of the list.
- **Filter persistence**: the filter lives in the page address alongside the existing sort control
  rather than being saved against the account, matching how sorting already behaves on this page and
  making a filtered view shareable.
- **Decades scope**: the decades figure covers all items, hidden included. The request scoped only the
  tag figure to non-hidden items, so the decade figure is read as describing the whole list. A decade
  is the calendar decade of the release year (1985 → the 1980s).
- **Reordering while filtered**: drag-to-reorder is withdrawn while hidden items are filtered out,
  because the visible sequence is not the sequence that would be saved. This keeps the ranked-order
  fix from the previous feature intact.
- **Tag limits**: tags are capped at 30 characters and 15 per item, and commas are treated as tag
  separators rather than tag content. These are presentational conveniences, not domain rules.
- **Tag casing**: the first casing used within a list is what suggestions display; matching and
  counting ignore case entirely.
- **Suggestion volume**: suggestions are capped at a handful of best matches, ordered by how often the
  tag is used in that list, then alphabetically.
- **No effect on outbound integrations**: hiding an item does not change what the list publishes to
  the external services it is already wired to, and does not change vote totals. Hiding is curation
  of how the list reads and how it is summarised, not a change to what the list contains.
- **Existing behaviour reused**: the list's current ordering behaviour is reused unchanged, including
  ranked ordering and the existing movie/TV/watched grouping for unranked lists; this feature adds no
  new ordering mode.
- **Build order**: hiding ships first, tags second, stats third, because the stats figures depend on
  both.
- **Durable storage expected**: hidden state and tags are recorded against the list's items rather
  than derived or held per session, so this feature changes how list items are stored. The requester
  attached specific technical conditions to that change — including how the hidden flag must be
  shaped and how it must not be scoped to a viewer — and those are preserved verbatim in the
  **Input** field above for the planning phase to honour.
