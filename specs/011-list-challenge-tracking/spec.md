# Feature Specification: List Challenge Tracking (declared tags, timeboxed history, grid tags, sticky header)

**Feature Branch**: `011-list-challenge-tracking`  
**Created**: 2026-09-07  
**Status**: Draft  
**Input**: User description: "List challenge tracking for collaborative lists. Context: these lists are used to run Hooptober, a yearly horror-movie challenge where you watch 31 films that between them satisfy a published set of categories. Tags model the categories; decade and production-country counts cover the "span N decades / N countries" style requirements. Four gaps to close, all on /lists/<slug>.

1. LIST-LEVEL TAG SECTION (tags declarable before any items exist)

- Today tags exist only as ListItemTag rows hanging off an item, so a category cannot be declared until some film carries it. Add a dedicated place to manage a list's tags — create, rename, delete — reachable from the list page.
- DECIDED SCHEMA: introduce `ListTag` as the CANONICAL per-list tag: (id, listId, label, normalized, createdAt) with @@unique([listId, normalized]) and an index on listId. `ListItemTag` becomes a JOIN: (id, listItemId, listTagId, createdAt) with @@unique([listItemId, listTagId]), replacing its current denormalized `label`/`normalized` columns. Do NOT keep a second source of truth — renaming a ListTag must propagate everywhere it is used, which is the whole point of this shape.
- REQUIRES A DATA MIGRATION that backfills: for each distinct (listId, normalized) currently present across ListItemTag rows, create a ListTag row (choose the label of the OLDEST such tag as canonical, matching today's buildTagVocabulary tie-break), then point every ListItemTag at it before dropping the old columns. This must not lose any existing tag assignment.
- Declared-but-unused tags must appear in autocomplete and must be listed in the stats view with a count of 0.
- Respect existing ListMember roles for who may manage tags; reuse canCurateListItems from src/lib/list-item-permissions.ts.

2. TIMEBOXED LIST WATCH HISTORY

- DECIDED SCHEMA: nullable `challengeStartsAt` and `challengeEndsAt` DateTime columns on `List`, editable in the existing list settings modal. Validate that end is not before start.
- A watch-history view for the list: which film, on which date, within the window. Sourced from WatchEntry (and EpisodeStatus for TV, consistent with how /history merges them) for titles that are on this list.
- DECIDED SCOPE: show ALL LIST MEMBERS' watches, attributed with the member's avatar and name, as one shared group scoreboard.
- The in-window tag / decade / country counts are computed across the whole group and count only watches that fall INSIDE the window. This is the core requirement: a film added to the list as a rewatch must not be credited by an older watch from before the window opened.
- Existing all-time list stats should remain available alongside the in-window numbers, so it stays clear which figure is which.

3. TAGS IN GRID VIEW

- Grid view currently shows tags nowhere; they are only visible in the item modal and list view. Call clear attention to an item's tags on the grid card without wrecking the poster grid's density.

4. STICKY LIST HEADER

- While scrolling a long list, a sticky element showing the list title and giving access to the "Add" and "Stats" actions that today live only in the header at the top of the page.

CONSTRAINTS

- Prisma migrations only — never `prisma db push`. Create with `yarn db:migrate --name <short_snake_description>`, commit prisma/schema.prisma together with the new prisma/migrations/<timestamp>\_\*/ folder, and run `yarn db:generate` afterwards. The ListItemTag reshape needs hand-written backfill SQL inside the generated migration, ordered so data is copied before columns are dropped.
- Prisma-generated enums cannot be imported in "use client" components; mirror any new enum as plain const objects following src/lib/notification-types.ts.
- Follow docs/ui-ux-standards.md for every visible change.
- Update every existing caller of the tag shape: src/lib/list-item-tags.ts (buildTagVocabulary, validateTagBatch), src/lib/list-stats.ts (computeListStats), the /api/lists/[slug]/items/[itemId]/tags routes, the items POST route that accepts tags on add, and the list page's tag plumbing through list-page-header / list-items-grid / list-items-list-view / list-item-modal / list-item-tag-editor.
- Unit-test new pure logic in src/lib/ with Vitest, including the in-window counting and the tag-vocabulary changes. Extend Playwright coverage for declaring a tag with no items, the timeboxed history view, and the sticky header actions.
- Existing tests to keep green: src/lib/list-item-tags.test.ts and src/lib/list-stats.test.ts both assert the current denormalized tag shape and will need updating rather than deleting.
- Do not reintroduce read-path partitioning of list items; reuse orderListItems() from src/lib/list-item-ordering.ts.
- Conventional Commits are required and semantic-release drives versioning. Split commits by layer — schema+migration, then generated client, then lib, then API routes, then UI, then tests — one logical concern each. Never bundle unrelated concerns into one commit."

## User Scenarios & Testing _(mandatory)_

The driving use case is a group challenge: a set of published categories, a fixed calendar window, and
several people watching films against the same scoreboard. A list is how the group organises that. Today
the list can describe what has been _collected_ but not what has been _achieved during the challenge_,
and a category cannot even be written down until a film has been found for it.

### User Story 1 - Declaring the categories before finding the films (Priority: P1)

The person running the challenge opens their list at the start of the season with the published category
sheet in hand — "a film from the 1930s", "a folk-horror film", "a film with a number in the title" — and
writes every category down as a tag on the list itself, before a single film has been chosen. As films
are added over the following weeks, each one is tagged from that declared set. Categories still showing
nothing tell the group exactly what is left to fill.

**Why this priority**: Without it the category sheet cannot be represented at all until films exist, so
the list cannot be used to plan a challenge — only to record one after the fact. Every other story in
this feature reports on tags, so the tag vocabulary has to be able to exist independently first.

**Independent Test**: Create an empty list, declare a handful of tags on it, and confirm they are
offered as suggestions when the first item is later tagged and are listed in the list's summary figures
with a count of nothing yet. Delivers the planning value on its own, with no other story shipped.

**Acceptance Scenarios**:

1. **Given** a list with no items at all, **When** a member with curation rights declares a tag, **Then** the tag is saved against the list and shown in the list's tag section.
2. **Given** a list with a declared tag that no item carries, **When** a member types the first letters of that tag while tagging an item, **Then** the declared tag is offered as a suggestion.
3. **Given** a list with a declared tag that no item carries, **When** a member opens the list's summary figures, **Then** that tag is listed with a count of zero rather than omitted.
4. **Given** a tag that several items already carry, **When** a curator renames it, **Then** every item that carries it shows the new name immediately, with no item left holding the old name.
5. **Given** a tag that several items already carry, **When** a curator deletes it, **Then** the tag disappears from the list's tag section, from suggestions, and from every item that carried it.
6. **Given** a view-only member, **When** they open the list, **Then** they can read the list's tags but are offered no way to create, rename, or delete them.
7. **Given** a list that already has a tag, **When** a curator tries to declare another tag that differs only by capitalisation or surrounding spaces, **Then** it is treated as the same tag rather than creating a duplicate.

---

### User Story 2 - Scoring only what was watched during the challenge (Priority: P2)

The group sets the challenge window on the list — for the horror challenge, the whole of September and
October. Everyone logs their viewing as normal. The list then shows a shared history: who watched which
film, on which date, inside the window; and a set of in-window figures — how many categories, decades,
and countries the group has covered _by watching_, not merely by adding titles to the list. A film that
someone happened to watch two years ago and has now added as a planned rewatch counts for nothing until
it is watched again inside the window.

**Why this priority**: This is the scoring engine of the challenge and the reason the tags matter, but it
is only meaningful once categories can be declared (Story 1). It is the largest single piece of the
feature and can be demonstrated on its own against an existing tagged list.

**Independent Test**: Set a window on a list holding tagged titles, log watches both inside and outside
the window across two members' accounts, and confirm the history view shows only the in-window watches
attributed to the right people, and that the in-window figures exclude the out-of-window watch while the
all-time figures still include the title.

**Acceptance Scenarios**:

1. **Given** a list, **When** a curator opens the list's settings, **Then** they can set and clear a challenge start date and end date.
2. **Given** a curator setting a window, **When** the end date is earlier than the start date, **Then** the change is rejected with a clear message and nothing is saved.
3. **Given** a list with a window set and members who have logged watches, **When** any member opens the list's watch history, **Then** they see one shared, date-ordered record of every list title watched inside the window, each line naming and picturing the member who watched it.
4. **Given** a member watched a list title before the window opened, **When** the watch history is viewed, **Then** that watch does not appear.
5. **Given** a list title tagged "folk horror" whose only watch predates the window, **When** the in-window figures are read, **Then** "folk horror" is not counted as covered.
6. **Given** the same title is then watched again inside the window, **When** the in-window figures are re-read, **Then** "folk horror" counts as covered.
7. **Given** two members each watched a different list title inside the window, **When** the in-window figures are read, **Then** both watches contribute to the same group totals.
8. **Given** a list title is a TV show and a member marked episodes watched inside the window, **When** the watch history is viewed, **Then** those episode viewings appear alongside film watches on the dates they happened.
9. **Given** a list with a window set, **When** the summary figures are opened, **Then** the in-window figures and the existing all-time figures are both shown and clearly labelled so it is never ambiguous which is which.
10. **Given** a list with no window set, **When** the watch history is viewed, **Then** it shows the members' watches of list titles with no date restriction, and no in-window figures are presented.

---

### User Story 3 - Seeing an item's categories on the poster grid (Priority: P3)

A member browsing the list in poster-grid view can tell at a glance which categories each film is
covering, without opening it. Scanning the grid is how the group spots the film that is doing double duty
and the film that is covering nothing.

**Why this priority**: A visibility improvement to information that already exists. Valuable for daily
use during a challenge, but the challenge can be run without it.

**Independent Test**: Open a list in grid view with tagged and untagged items and confirm tags are
legible on the tagged cards while the grid still reads as a poster grid.

**Acceptance Scenarios**:

1. **Given** a list in grid view with tagged items, **When** a member views the grid, **Then** each tagged card shows its tags without the member opening the item.
2. **Given** an item carrying more tags than a card can show, **When** the card is viewed, **Then** some are shown and the remainder are indicated as a count rather than overflowing the card.
3. **Given** an item with no tags, **When** the card is viewed, **Then** the card takes no extra height and shows no empty tag area.
4. **Given** a list of many items in grid view, **When** the grid is viewed, **Then** the number of posters visible per row is unchanged from today.

---

### User Story 4 - Keeping the list's actions in reach on a long list (Priority: P4)

A challenge list runs to dozens of films. A member scrolled halfway down can still see which list they
are in and can add a film or check the figures without scrolling back to the top.

**Why this priority**: Pure convenience on an existing capability, independent of everything else here.

**Independent Test**: Scroll a long list past the header and confirm the list title stays visible and
both actions still work from where the member is.

**Acceptance Scenarios**:

1. **Given** a list long enough to scroll, **When** a member scrolls past the top of the page, **Then** an element showing the list title remains visible.
2. **Given** that element is visible, **When** the member uses its add action, **Then** the same add flow opens as from the top of the page.
3. **Given** that element is visible, **When** the member uses its figures action, **Then** the same summary figures open as from the top of the page.
4. **Given** a member without permission to add items, **When** they scroll a long list, **Then** the persistent element offers them no add action.
5. **Given** a list short enough to fit the screen, **When** it is viewed, **Then** no duplicate title bar is shown.

---

### Edge Cases

- **Renaming a tag onto an existing one**: a curator renames "folk-horror" to "folk horror" when both
  already exist. Treated as a collision and rejected with a clear message; merging two tags is out of
  scope for this feature.
- **Declaring a tag that items already carry**: the tag is already in use from before this feature; the
  declared tag and the in-use tag must be the same tag, not two entries with the same name.
- **Deleting a tag that many items carry**: the deletion removes the tag from every item. The member is
  told how many items are affected before it happens.
- **A tag capped out**: an item already at the per-item tag limit cannot be given another; declaring more
  tags on the list does not raise that limit.
- **Window with only one end set**: a start with no end reads as "open-ended from that date"; an end with
  no start reads as "everything up to that date".
- **A watch exactly on the window boundary**: counts as inside the window at both ends.
- **A member watched a list title, then left the list**: their watches leave the shared history with them,
  because the history is the current membership's scoreboard.
- **A title watched several times inside the window**: every watch appears in the history, but each
  category, decade, and country it covers is credited once.
- **A hidden item watched inside the window**: hidden items are excluded from the figures, consistent with
  today's all-time figures, but the watch itself is still shown in the history.
- **An untagged film watched inside the window**: it appears in the history and contributes to decade and
  country coverage, but covers no category.
- **A film with no known release year or no known country**: it contributes to no decade or country figure
  and is not reported as an error.
- **A window in the past or entirely in the future**: an empty history with a short explanation, not an
  error.
- **Existing tag data on upgrade**: every tag assignment that exists today survives the change to how tags
  are stored, and a tag whose name was written with different capitalisation on different items settles on
  one name — the earliest one used, matching how the list already picks a name to display.

## Requirements _(mandatory)_

### Functional Requirements

**List tags as a declared vocabulary**

- **FR-001**: A list MUST be able to hold tags of its own, independently of whether any item carries them.
- **FR-002**: The list page MUST offer a dedicated place to see all of the list's tags and to create, rename, and delete them.
- **FR-003**: Creating, renaming, and deleting a list's tags MUST be limited to members whose role already allows curating that list's items; everyone who can see the list MUST be able to read its tags.
- **FR-004**: A list MUST NOT hold two tags that differ only by capitalisation or surrounding whitespace; an attempt to add such a tag MUST resolve to the existing tag.
- **FR-005**: Renaming a tag MUST change how it reads everywhere it is used, with no item left showing the previous name and no second copy created.
- **FR-006**: Deleting a tag MUST remove it from every item that carries it, and MUST tell the member how many items will be affected before the deletion is confirmed.
- **FR-007**: A tag that no item carries MUST still be offered as a suggestion when a member is tagging an item.
- **FR-008**: Tagging an item MUST be limited to the list's tags: entering a name that is not yet one of them MUST create it as a list tag as part of the same action, so an item can never carry a tag the list does not know about.
- **FR-009**: The list's summary figures MUST list every tag the list holds, including those carried by no item, showing a count of zero for those.
- **FR-010**: Every tag assignment that exists before this change MUST still exist after it, attached to the same item and reading with the same name that the list already displays for it.

**Challenge window**

- **FR-011**: A list MUST be able to record an optional challenge start date and an optional challenge end date.
- **FR-012**: The challenge window MUST be editable from the list's existing settings, by members whose role already allows changing list settings.
- **FR-013**: The system MUST reject a window whose end is earlier than its start, with a clear message, saving nothing.
- **FR-014**: Both dates MUST be clearable, returning the list to having no window.

**Shared timeboxed watch history**

- **FR-015**: A list MUST offer a watch-history view showing, for titles on that list, which title was watched, on which date, and by which member.
- **FR-016**: The history MUST cover all of the list's members as a single shared record, attributing each watch with that member's name and avatar.
- **FR-017**: When the list has a challenge window, the history MUST include only watches falling inside it, treating watches exactly on either boundary as inside.
- **FR-018**: The history MUST include both film watches and TV episode viewings, presented on the dates they happened in the same date-ordered record.
- **FR-019**: The history MUST be visible to every member who can see the list.
- **FR-020**: When the list has no challenge window, the history MUST show the members' watches of list titles without date restriction.

**In-window coverage figures**

- **FR-021**: The system MUST report, for the challenge window, how many of the list's tags, how many decades, and how many countries the group has covered by watching inside the window.
- **FR-022**: The in-window figures MUST count a title's tags, decade, and countries only if that title was watched inside the window by at least one member; a title merely present on the list MUST NOT contribute.
- **FR-023**: The in-window figures MUST combine all members' in-window watches into one set of group totals.
- **FR-024**: A title watched more than once inside the window MUST contribute each tag, decade, and country it covers exactly once.
- **FR-025**: The existing all-time figures for the list MUST remain available, presented alongside the in-window figures and labelled so a reader can always tell which is which.
- **FR-026**: The in-window figures MUST be presented only when the list has a challenge window.

**Tags on the poster grid**

- **FR-027**: The poster-grid view MUST show an item's tags on the item's card.
- **FR-028**: Showing tags on a card MUST NOT reduce how many posters fit in a row, and MUST add no visual weight to cards that carry no tags.
- **FR-029**: When an item carries more tags than its card can legibly show, the card MUST show as many as fit and indicate the number remaining.

**Persistent list actions**

- **FR-030**: While a member is scrolled past the top of a long list, an element showing the list's name MUST remain visible.
- **FR-031**: That element MUST give access to adding an item and to opening the list's summary figures, behaving identically to the equivalent actions at the top of the page.
- **FR-032**: That element MUST offer the add action only to members permitted to add items, and MUST NOT appear on a list short enough not to scroll.

### Key Entities

- **List tag**: a category the list tracks. Belongs to one list, has a name that reads the same wherever
  it appears, and is unique within its list irrespective of capitalisation. Exists whether or not any item
  carries it. Renaming or deleting it affects every item that carries it.
- **Tag assignment**: the fact that one list item carries one of its list's tags. Carries no name of its
  own — it reads with whatever name the list tag currently has. An item carries a given tag at most once.
- **Challenge window**: an optional start date and end date on a list, defining the period whose watches
  count towards the challenge.
- **Watch record (existing)**: an existing record that a member watched a title, or an episode of one, on
  a date. Not changed by this feature; read by the list's history view and in-window figures.
- **List membership (existing)**: who belongs to a list and in what role. Determines whose watches appear
  in the shared history, who may manage the list's tags, and who may set the window.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A member can declare a published set of 31 challenge categories on a brand-new, empty list and have all of them visible as the list's tags, with no film added.
- **SC-002**: 100% of tag assignments present before the change are still present, on the same items and reading with the same name, after it.
- **SC-003**: Renaming a category updates how it reads on every item carrying it, with zero items left showing the old name.
- **SC-004**: For a list whose only watch of a tagged title predates the window, the in-window coverage figure for that category reads zero; after that title is watched inside the window, it reads one. Verifiable without inspecting any internals.
- **SC-005**: A member can determine, from the list page alone, how many categories remain uncovered for the current window, in under 15 seconds.
- **SC-006**: A member can identify who watched a given list title and when, for every in-window watch, from the list's history view without leaving the list page.
- **SC-007**: Posters per row in grid view is identical before and after this feature at every supported window width.
- **SC-008**: On a list of 60 items, both the add and the figures actions are reachable from any scroll position without scrolling back to the top.
- **SC-009**: Setting an end date earlier than the start date is rejected 100% of the time with a message that says what is wrong, and leaves the previously saved window untouched.
- **SC-010**: All existing list behaviour — ordering, hiding, voting, comments, and the all-time figures — behaves the same as before this feature.

## Assumptions

These are reasonable defaults chosen where the request did not specify. Each can be overturned during
clarification or planning without reshaping the feature.

- **Who may manage a list's tags**: the same members who may already curate the list's items — owners and
  contributors — matching the rule established for tagging items. View-only members read tags but cannot
  change them. The request named this explicitly.
- **Who may set the window**: the challenge window is a list setting, so it follows whoever may already
  change the list's settings, not the item-curation rule. Flag for confirmation if these should be the
  same group.
- **Free-typing a tag still works**: tagging an item by typing a name that the list does not yet hold
  creates the list tag as a side effect rather than being refused. Declaring tags up front is the new
  planning path, not a new restriction on the existing quick path.
- **Renaming onto an existing tag is a conflict, not a merge**: rejected with a message. Merging two
  categories into one is a separate capability and is out of scope.
- **Deleting a tag is a hard delete**: it is removed from every item that carries it, after the member is
  shown how many items that is. There is no undo and no archive.
- **Tag limits unchanged**: the existing per-item tag cap and per-tag length cap carry over untouched. No
  cap is placed on how many tags a list may declare, beyond what is practical to display.
- **Window boundaries are inclusive** at both ends, and are interpreted consistently with how the app
  already treats watch dates elsewhere, so a watch logged on the closing day still counts.
- **A half-open window is valid**: a start alone means "from then on"; an end alone means "up to then".
- **No window means no scoreboard**: with no window set, the history view still works with no date
  restriction and the in-window figures are simply not shown, rather than defaulting to all time and
  duplicating the existing figures.
- **Whose watches count**: all current members of the list, including its owner, regardless of role — a
  view-only member's watches still count towards the group total, because they are still taking part in
  the challenge. Membership is evaluated as it stands when the page is read, so a departed member's
  watches leave with them.
- **Watch history visibility inside a list is membership-based**: joining a shared challenge list means
  the group can see what you watched from that list within the window. This is a deliberate divergence
  from the profile-level watch-history visibility rules that govern the title and profile pages, where a
  member chooses who may see their history. Scoped to titles on the list and, when a window is set, to the
  window. Flag for confirmation, as it is the only privacy-relevant decision in this feature.
- **Hidden items still excluded from figures**: consistent with today's all-time figures. Their watches
  still appear in the history, because hiding is about how the list reads, not a claim that a watch did
  not happen.
- **Decades and countries keep their existing meaning**: a decade is the calendar decade of the release
  year, and a co-production counts once for each of its countries — the definitions already used by the
  list's all-time figures, now applied to the in-window set.
- **Untagged watches still count for decades and countries**: coverage of decades and countries is a
  property of what was watched, not of how it was tagged.
- **All-time figures stay as they are**: this feature adds an in-window set beside them; it does not
  redefine, replace, or re-scope the existing figures.
- **The history is a view, not a new log**: it reads the watch records the app already keeps. This feature
  adds no new way to record a watch, and does not change what watching a film means anywhere else.
- **Ordering untouched**: the list's existing ordering and grouping behaviour is reused unchanged; this
  feature adds no ordering mode and no new way of splitting the list on read.
- **Build order**: the declared tag vocabulary first, since the in-window figures report on it; then the
  window and the history; then the two presentation improvements, which are independent of the rest.
- **Durable storage expected**: the list's tags and the challenge window are recorded against the list
  rather than derived or held per session, so this feature changes how lists and their tags are stored,
  including reshaping tag data that already exists. The requester attached specific technical conditions
  to that change — the exact shape the tag records must take, the requirement that there be a single
  source of truth for a tag's name, the ordering of the data backfill so that no existing tag assignment
  is lost, the named existing callers and tests that must be updated, and the commit sequencing — and
  those are preserved verbatim in the **Input** field above for the planning phase to honour.
