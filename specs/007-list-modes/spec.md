# Feature Specification: List Modes & Feature Toggles

**Feature Branch**: `007-list-modes`  
**Created**: 2026-05-23  
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Ranked List (Priority: P1)

A list owner wants to build a curated "Top 10 Horror Movies" list. They create a new list using the "Ranked" preset, which sets the list to ranked mode with list-view display and disables voting (since the owner defines the order). They add items and drag them into their preferred order. Visitors see the items numbered 1–10 in a vertical list layout with the owner's notes visible for each entry.

**Why this priority**: Ranking is the centerpiece of this feature set and the clearest differentiation from the current grid-only, always-on-voting design.

**Independent Test**: Create a list with the Ranked preset, add 5 items, reorder them by drag-and-drop, and verify numbered positions are saved and displayed correctly in list view.

**Acceptance Scenarios**:

1. **Given** a list owner selects the "Ranked" preset on creation, **When** they add items, **Then** items display with sequential position numbers (1, 2, 3…) in list-view layout.
2. **Given** a ranked list with items, **When** an owner or contributor drags an item to a new position, **Then** all position numbers update immediately and the new order persists after page reload.
3. **Given** a ranked list with an item cap of 10, **When** the owner tries to add an 11th item, **Then** the add action is blocked and an explanation is shown.
4. **Given** a ranked list, **When** a viewer visits the list, **Then** no voting controls are visible (voting is disabled for ranked lists).

---

### User Story 2 - Run a Group Poll (Priority: P1)

A list member wants to crowdsource what the group should watch next. They use the "Poll" preset, which enables voting and disables ranking. Members upvote or downvote items; the list is sortable by vote score. The owner uses this to make the final call.

**Why this priority**: Voting already exists but has no toggle — this makes it an intentional choice tied to a coherent use case.

**Independent Test**: Create a Poll list, add items, vote from two different accounts, and verify vote totals are visible and the list can be sorted by score.

**Acceptance Scenarios**:

1. **Given** a list using the "Poll" preset, **When** a member views the list, **Then** voting controls are visible on each item and no drag-reorder handles are shown.
2. **Given** a Poll list, **When** two members vote differently on an item, **Then** the aggregate vote score reflects both votes.
3. **Given** a Poll list sorted by votes, **When** a new vote is cast, **Then** the sort order updates to reflect the new scores.

---

### User Story 3 - Add a Spoiler Note to a List Item (Priority: P2)

A list editor adds per-item notes explaining why a film made the list, but one note contains a plot spoiler. They flag it as a spoiler. Visitors see a "Spoiler — tap to reveal" affordance instead of the note text until they choose to unhide it.

**Why this priority**: Notes are already surfaced in the item modal; spoiler protection is a low-effort, high-trust addition that makes editors more willing to write detailed notes.

**Independent Test**: Add a note to a list item, mark it as a spoiler, then view the list as a different user and verify the note is hidden behind a reveal action.

**Acceptance Scenarios**:

1. **Given** an editor adds a note to a list item and marks it as a spoiler, **When** any user views the item (in modal or list view), **Then** the note content is hidden and a "Spoiler — reveal" control is shown in its place.
2. **Given** a spoiler note that has been revealed, **When** the user navigates away and returns, **Then** the note is hidden again (not persisted as revealed).
3. **Given** a non-spoiler note, **When** a user views the item, **Then** the note is displayed inline without any spoiler affordance.

---

### User Story 4 - Switch Display Mode (Priority: P2)

A list owner toggles the display between grid and list view. Grid view shows compact poster cards (current behavior). List view shows a taller row per item with the poster thumbnail, title, year, and the editor's notes visible inline — giving more room for per-item commentary and making the ranking number prominent.

**Why this priority**: List view is the natural companion to ranking and spoiler notes; it surfaces content that the grid obscures.

**Independent Test**: Toggle a list from grid to list display, verify items render in a vertical list with inline notes visible, then toggle back and verify grid is restored.

**Acceptance Scenarios**:

1. **Given** a list in grid display mode, **When** the owner switches to list display, **Then** items render as vertical rows with poster thumbnail, title, year, ranking number (if ranked), and notes visible.
2. **Given** a list in list display mode with a spoiler note, **When** the user views the list, **Then** the spoiler note is hidden behind a reveal affordance inline in the row.
3. **Given** a list display setting, **When** a viewer visits the list, **Then** they see the display mode the owner configured, not a personal preference.

---

### User Story 5 - Configure Feature Toggles on an Existing List (Priority: P3)

A list owner opens list settings and enables or disables comments and voting independently. They may also change the display mode or set/remove an item cap without having to recreate the list.

**Why this priority**: Existing lists need a migration path; owners should be able to evolve a list's mode without starting over.

**Independent Test**: Open settings on an existing list, disable comments, and verify the comment section and badge no longer appear for any user.

**Acceptance Scenarios**:

1. **Given** a list with comments enabled, **When** the owner disables comments in settings, **Then** the comment UI disappears from the item modal and no new comments can be posted.
2. **Given** a list with ranking disabled, **When** the owner enables ranking in settings, **Then** voting is automatically disabled and drag handles appear.
3. **Given** a list with no item cap, **When** the owner sets a cap of 5, **Then** adding a 6th item is blocked; existing items beyond the cap are not removed.

---

### User Story 6 - Use a List Preset on Creation (Priority: P3)

When creating a new list, the owner is presented with named preset options — Watchlist, Poll, and Ranked — alongside a Custom option. Selecting a preset pre-configures the feature toggles and display mode to a coherent combination. The owner can still override individual settings after selecting a preset.

**Why this priority**: Presets guide users to valid combinations and reduce configuration errors (e.g., ranking + voting enabled simultaneously).

**Independent Test**: Create a list using each preset and verify the resulting feature flag combination matches the preset definition.

**Acceptance Scenarios**:

1. **Given** a user selects "Watchlist" preset, **When** the list is created, **Then** voting is off, ranking is off, comments are on, and display is grid.
2. **Given** a user selects "Poll" preset, **When** the list is created, **Then** voting is on, ranking is off, comments are on, and display is grid.
3. **Given** a user selects "Ranked" preset, **When** the list is created, **Then** ranking is on, voting is off, comments are on, and display is list.
4. **Given** any preset is selected, **When** the owner modifies individual toggles before saving, **Then** those overrides are respected.

---

### Edge Cases

- What happens if an owner enables ranking on a list that already has many items — do they get assigned positions in current sort order?
- What happens to existing votes when an owner switches from Poll to Ranked mode? (Votes should be preserved in storage but hidden from UI.)
- What happens if an owner sets a cap lower than the current item count? (Cap applies to new additions only; existing items are not removed.)
- What if a contributor tries to reorder items in a ranked list? (Contributors can reorder; viewers cannot.)
- What happens to the "Votes" sort option when voting is disabled? (It should be hidden from sort controls.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Each list MUST store independent feature flags for: voting enabled, comments enabled, ranking enabled, display mode (grid/list), and optional item cap.
- **FR-002**: Ranking and voting MUST be mutually exclusive — enabling one MUST automatically disable the other.
- **FR-003**: When ranking is enabled, list items MUST have an explicit position field that determines display order.
- **FR-004**: Owners and contributors MUST be able to reorder ranked items via drag-and-drop; viewers MUST NOT be able to reorder.
- **FR-005**: When an item cap is set and the list is at capacity, the system MUST prevent new items from being added and display an explanation.
- **FR-006**: Item notes MUST support a spoiler flag; when flagged, the note content MUST be hidden behind a user-triggered reveal action.
- **FR-007**: The spoiler reveal state MUST NOT be persisted — content returns to hidden on next page load.
- **FR-008**: List display mode (grid/list) MUST be a list-level setting controlled by the owner, not a per-viewer preference.
- **FR-009**: In list display mode, each row MUST show: position number (if ranked), poster thumbnail, title, year, and item notes inline.
- **FR-010**: The list creation flow MUST offer at least three named presets (Watchlist, Poll, Ranked) that pre-configure feature flags to coherent combinations.
- **FR-011**: Owners MUST be able to change any feature flag on an existing list from list settings.
- **FR-012**: When comments are disabled, all comment UI MUST be hidden and posting MUST be rejected by the API.
- **FR-013**: When voting is disabled, all vote UI MUST be hidden and vote submissions MUST be rejected by the API.
- **FR-014**: The "Votes" sort option MUST be hidden when voting is disabled on a list.

### Key Entities

- **List**: Extended with `rankingEnabled` (bool), `votingEnabled` (bool), `commentsEnabled` (bool), `displayMode` (GRID/LIST), `itemCap` (optional int).
- **ListItem**: Extended with `position` (optional int, used when ranking is enabled) and `noteIsSpoiler` (bool).
- **List Preset**: A named configuration template (Watchlist, Poll, Ranked) that maps to a specific combination of feature flags — not a stored entity, defined in application logic.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A list owner can create a ranked list, add items, and reorder them without leaving the list page.
- **SC-002**: Feature flags (voting, comments, ranking) correctly gate their respective UI and API endpoints — disabling a feature hides the UI and rejects API calls for 100% of cases.
- **SC-003**: Ranking and voting are never simultaneously enabled on any list — the constraint is enforced at both the UI and data layers.
- **SC-004**: Spoiler notes are hidden by default and revealed only on explicit user action, with no reveal state persisted across page loads.
- **SC-005**: All three presets produce the expected feature flag combination with zero manual toggle changes required.
- **SC-006**: Item cap enforcement prevents over-limit additions while leaving existing items untouched.

## Assumptions

- The item cap applies only to future additions; existing items are never auto-removed when a cap is set or lowered below current count.
- Votes are preserved in storage when voting is disabled (so re-enabling voting restores prior votes), but are not displayed while disabled.
- When ranking is first enabled on an existing list, items are assigned positions based on current sort order (date added ascending).
- The drag-and-drop reorder interaction is desktop-first; touch/mobile support is a nice-to-have, not required for v1.
- Preset definitions are fixed in application logic for v1; user-defined custom presets are out of scope.
- Display mode is controlled by the list owner and applies uniformly to all viewers; per-user display preference overrides are out of scope.
- Comment deletion, read-tracking, and unread badges are unaffected by the comments toggle — those behaviors remain as-is when comments are enabled.
