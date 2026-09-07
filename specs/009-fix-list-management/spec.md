# Feature Specification: Fix List Management (rename, reorder, layout, search)

**Feature Branch**: `009-fix-list-management`  
**Created**: 2026-09-06  
**Status**: Draft  
**Input**: User description: "Fix four list management bugs reported by a user on a collaborative list (/lists/<slug>): 1. Cannot rename a list after creation — no way to edit the list name (and presumably description) from the list page. 2. Drag-and-drop reordering of list items appears to work optimistically but does not persist — after a page refresh the original order is back. 3. Cannot change the list layout/display mode after the list has been created — the layout chosen at creation time is locked in. 4. Adding titles via search is too limited: searching for the 1985 film "House" or the 1989 film "Arena" returns no usable result, and there is no way to refine the search (e.g. by year, media type, or paging through more results) beyond the initial result set. Deliverable: implement all four fixes end-to-end (API routes, lib layer, UI), with unit tests for new pure logic and updated/added E2E coverage for the list edit + reorder journeys, then deploy."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reordering a ranked list sticks (Priority: P1)

A list owner or contributor viewing a ranked list drags an item to a new position. The item moves,
and the new order is the order everyone sees from then on — after a refresh, after navigating away
and back, and for every other member of the list.

**Why this priority**: This is a silent data-loss bug. The interface tells the user their change
succeeded and it does not. Ranking is the whole point of a ranked list, so the feature is currently
unusable and users cannot tell why.

**Independent Test**: Open a ranked list with at least three items, drag the last item to first,
reload the page, and confirm it is still first. Log in as a second member and confirm they see the
same order.

**Acceptance Scenarios**:

1. **Given** a ranked list with items A, B, C in positions 1, 2, 3, **When** a contributor drags C
   above A, **Then** the displayed order becomes C, A, B and the displayed rank numbers read 1, 2, 3
   top to bottom.
2. **Given** the reorder in scenario 1 has completed, **When** the page is reloaded, **Then** the
   order is still C, A, B.
3. **Given** the reorder in scenario 1 has completed, **When** a different member opens the same
   list, **Then** they see the order C, A, B.
4. **Given** a ranked list containing a mix of movies and TV shows, some marked watched by the
   viewer, **When** a contributor reorders any item, **Then** the saved order matches exactly the
   order shown after the drag, with no items jumping to a different group on reload.
5. **Given** a viewer with read-only access to a ranked list, **When** they view it, **Then** no
   drag affordance is offered and the list is displayed in its saved ranked order.
6. **Given** a reorder request fails (network or server error), **When** the failure occurs,
   **Then** the displayed order returns to the last known saved order and the user is shown a
   user-safe error message.

---

### User Story 2 - Renaming a list and editing its description (Priority: P1)

A list owner realises the list name has a typo, or wants to retitle it after the list's purpose has
drifted. From the list page they can edit the name and the description and save, and the new name is
what they and every other member see.

**Why this priority**: A name is the primary identity of a list, and being permanently stuck with a
first-draft name is the most visible of the four complaints. It is also the cheapest to fix once the
edit surface exists.

**Independent Test**: Open a list you own, edit the name and description, save, and confirm the new
values appear on the list page and in the lists index.

**Acceptance Scenarios**:

1. **Given** a list the user owns, **When** they open the list's edit surface, **Then** the current
   name and description are pre-filled and editable.
2. **Given** the edit surface is open with a changed name, **When** the user saves, **Then** the
   list page header shows the new name without requiring a manual reload, and the lists index shows
   the new name.
3. **Given** the edit surface is open, **When** the user clears the name and saves, **Then** the
   save is rejected with a clear message and the existing name is retained.
4. **Given** the edit surface is open, **When** the user clears the description and saves, **Then**
   the description is removed and the list renders correctly with no description.
5. **Given** a name longer than the allowed maximum, **When** the user saves, **Then** the save is
   rejected with a message stating the limit.
6. **Given** a non-owner member (contributor or viewer), **When** they view the list, **Then** no
   name or description editing affordance is offered to them, and a direct edit attempt is refused.
7. **Given** a list is renamed, **When** members navigate to the list by its existing URL, **Then**
   the URL still resolves to the same list.

---

### User Story 3 - Finding hard-to-search titles when adding to a list (Priority: P2)

A contributor wants to add the 1985 film _House_ and the 1989 film _Arena_ to a list. They type the
title, see that the top matches are not the film they mean, and narrow the search — restricting to
films only, giving the release year, or loading more results — until the right title appears, then
add it.

**Why this priority**: Adding the wrong title, or being unable to add a title at all, blocks the
core purpose of a list. It affects any short or generic title, not just the two reported. It is P2
only because it degrades rather than destroys existing data.

**Independent Test**: Open the add-title flow on any list, search "House", restrict to movies and
set the year to 1985, and confirm the 1985 film is selectable and can be added.

**Acceptance Scenarios**:

1. **Given** the add-title flow, **When** the user searches "House" with no refinement, **Then**
   they see results plus a visible way to refine (media type, release year) and a visible way to see
   more results.
2. **Given** the search "House", **When** the user restricts to movies and sets the year to 1985,
   **Then** the 1985 film _House_ appears in the results and can be added to the list.
3. **Given** the search "Arena", **When** the user restricts to movies and sets the year to 1989,
   **Then** the 1989 film _Arena_ appears in the results and can be added to the list.
4. **Given** a search returning more matches than fit in one result set, **When** the user requests
   more results, **Then** additional distinct results are appended or shown without losing the
   query or the active refinements.
5. **Given** each result in the list, **When** the user reads it, **Then** the release year and
   whether it is a film or a TV show are shown, so same-named titles are distinguishable.
6. **Given** a refinement that matches nothing, **When** the results come back empty, **Then** an
   empty state explains that no titles matched and invites the user to widen the search.
7. **Given** active refinements, **When** the user clears them, **Then** the unrefined results for
   the same query are shown again.

---

### User Story 4 - Changing a list's layout after creation (Priority: P3)

A list owner who picked grid layout at creation time, and now has 60 items, switches the list to the
compact list layout and sees the change take effect immediately.

**Why this priority**: Lowest impact of the four — the list is still fully usable in the layout it
was created with. Included because the reporter hit it and the ability is expected to sit alongside
renaming in the same edit surface.

**Independent Test**: Open a list you own that was created in grid layout, switch it to list layout,
and confirm the items re-render in the list layout and stay that way after a reload.

**Acceptance Scenarios**:

1. **Given** a list the user owns displayed as a grid, **When** the owner switches the layout to
   list, **Then** the items re-render in list layout without a manual reload.
2. **Given** the layout has been changed, **When** the page is reloaded or another member opens the
   list, **Then** the newly chosen layout is shown.
3. **Given** the layout control, **When** the owner opens it, **Then** the list's current layout is
   shown as the selected option.
4. **Given** a ranked list, **When** the owner switches the layout, **Then** ranked order and rank
   numbers are preserved and reordering still works in the layout that supports it.
5. **Given** a non-owner member, **When** they view the list, **Then** they are not offered a layout
   control and a direct change attempt is refused.

---

### Edge Cases

- **Concurrent reorder**: two contributors reorder the same list at nearly the same time. The last
  write wins for the whole list; no item is left without a position and no two items share a
  position.
- **Reorder while another member adds an item**: a newly added item must appear in the list with a
  well-defined position (end of the ranked order) rather than silently displacing existing ranks.
- **Reorder on an unranked list**: reordering is not offered, and a direct attempt is refused with a
  clear reason.
- **Single-item or empty list**: reorder affordances and layout switching behave without error.
- **Rename to a name another list already uses**: allowed — list names are not unique — and both
  lists remain reachable at their own URLs.
- **Name that is only whitespace**: treated as empty and rejected.
- **Name or description containing markup or emoji**: stored and displayed as literal text, never
  interpreted.
- **Very long description**: rejected above the documented limit rather than truncated silently.
- **Search catalog unavailable or rate-limited**: the add-title flow shows a user-safe error and
  remains usable once the catalog recovers; no raw provider error is exposed.
- **Search paging past the last page**: the "more results" affordance disappears or reports that all
  results are shown, rather than erroring or looping.
- **Rapid typing during search**: only the results for the latest query are shown; stale responses
  never overwrite newer ones.
- **Year refinement with a non-numeric or out-of-range value**: rejected with a clear message, or
  ignored, but never sends the flow into an error state.
- **Adding a title already on the list**: the existing duplicate behaviour is preserved (the user is
  told it is already on the list rather than getting a second copy).
- **Layout switch on a list where the two layouts group items differently**: the set of items shown
  is identical in both layouts; only presentation differs.

## Requirements _(mandatory)_

### Functional Requirements

**Reordering (User Story 1)**

- **FR-001**: The system MUST persist a reordering of a ranked list so that the order shown
  immediately after the drag is the order stored for the list.
- **FR-002**: The system MUST show the stored ranked order to every member on every subsequent load
  of the list, in both supported layouts, until it is changed again.
- **FR-003**: The system MUST NOT regroup or re-sort a ranked list's items by media type, watched
  state, or date added when the list is ranked — ranked order is the only ordering applied.
- **FR-004**: The system MUST assign every item in a ranked list a unique, contiguous rank starting
  at 1 after any reorder.
- **FR-005**: The system MUST restrict reordering to the list owner and contributors, and MUST
  refuse a reorder attempt from a viewer or non-member.
- **FR-006**: The system MUST refuse a reorder attempt on a list that does not have ranking enabled,
  with a clear reason.
- **FR-007**: The system MUST revert the displayed order to the last known saved order and surface a
  user-safe error if a reorder cannot be saved.

**Name and description (User Story 2)**

- **FR-008**: List owners MUST be able to change a list's name from the list page.
- **FR-009**: List owners MUST be able to change or remove a list's description from the same
  surface as the name.
- **FR-010**: The system MUST reject an empty or whitespace-only name and retain the previous name.
- **FR-011**: The system MUST enforce a maximum length on the name and on the description, and
  report the limit when a submission exceeds it.
- **FR-012**: The system MUST show the updated name and description on the list page after a
  successful save without requiring a manual reload, and everywhere else the list is listed.
- **FR-013**: The system MUST keep a list reachable at its existing URL after a rename.
- **FR-014**: The system MUST refuse name and description changes from anyone other than the list
  owner, and MUST NOT offer the editing affordance to them.

**Layout (User Story 4)**

- **FR-015**: List owners MUST be able to change a list's layout between the grid and list
  presentations after creation.
- **FR-016**: The system MUST apply a layout change immediately without a manual reload and MUST
  persist it for all members and all subsequent loads.
- **FR-017**: The layout control MUST show the list's current layout as its selected value.
- **FR-018**: The system MUST refuse layout changes from anyone other than the list owner.
- **FR-019**: The system MUST present the same set of items in either layout, and MUST preserve
  ranked order and rank numbers across a layout change.

**Adding titles by search (User Story 3)**

- **FR-020**: The add-title flow MUST let the user restrict results to films only or TV shows only,
  as well as search both.
- **FR-021**: The add-title flow MUST let the user restrict results by release year.
- **FR-022**: The add-title flow MUST let the user retrieve results beyond the first result set for
  the same query and refinements, until no further results exist.
- **FR-023**: The add-title flow MUST show the release year and the film/TV distinction for every
  result.
- **FR-024**: The system MUST return the 1985 film _House_ for the query "House" restricted to films
  and the year 1985, and the 1989 film _Arena_ for the query "Arena" restricted to films and the
  year 1989.
- **FR-025**: The system MUST validate search refinements and reject or ignore invalid values with a
  clear message, never a raw provider or server error.
- **FR-026**: The system MUST show an explanatory empty state when a query plus refinements matches
  nothing.
- **FR-027**: The system MUST discard results from superseded queries so that only the latest
  query's results are displayed.
- **FR-028**: The system MUST preserve the query and active refinements when more results are
  requested.

**Cross-cutting**

- **FR-029**: All four capabilities MUST require an authenticated session, and MUST refuse
  unauthenticated requests.
- **FR-030**: Existing lists MUST continue to work unchanged after this feature ships — no list
  loses items, membership, ranked order, or layout.
- **FR-031**: Error messages surfaced to users MUST be human-readable and MUST NOT include internal
  diagnostics.

### Key Entities

- **List**: A collaborative collection with a name, an optional description, a stable URL
  identifier, a layout choice, visibility, and feature toggles including whether ranking is enabled.
  Owned by one user; has members with roles.
- **List item**: A title on a list. Carries a rank position when the list is ranked, who added it,
  when it was added, and per-item extras (notes, votes, comments).
- **List membership**: The link between a user and a list, carrying a role that determines whether
  they may reorder items (owner, contributor) or only read (viewer).
- **Title search result**: A candidate title from the external catalog, identified by catalog id,
  with a display title, release year, film/TV distinction, and poster.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of reorders performed on a ranked list are still in effect after a page reload
  and for other members of that list.
- **SC-002**: A list owner can rename a list and see the new name in under 15 seconds from opening
  the list page, without leaving the page.
- **SC-003**: A list owner can change a list's layout and see the new layout applied in under 10
  seconds, without leaving the page.
- **SC-004**: Both reported hard-to-find titles (the 1985 film _House_, the 1989 film _Arena_) are
  findable and addable within three interactions after typing the title.
- **SC-005**: 95% of add-title searches return displayed results within 2 seconds of the user
  finishing typing.
- **SC-006**: All four reported problems are reproducible before the change and not reproducible
  after it, verified by an automated end-to-end check for the list edit and reorder journeys.
- **SC-007**: Zero unauthorised changes are possible: viewers and non-members cannot rename a list,
  change its layout, or reorder its items.
- **SC-008**: No user-facing error surface exposes internal diagnostics for any of the four flows.

## Assumptions

- **Ordering semantics**: Reordering remains a capability of ranked lists only — enabling ranking is
  how a list opts into manual order. Un-ranked lists keep their existing sort controls. Fixing
  reorder means making the ranked case honour the saved order, not adding manual order to un-ranked
  lists.
- **Permissions**: Renaming, editing the description, and changing the layout stay owner-only,
  matching how the list's other settings already behave. Reordering stays open to owner and
  contributors, matching the current rule.
- **Layout is a list property, not a per-viewer preference**: changing the layout changes it for
  every member. A per-viewer layout override is out of scope.
- **URL stability**: the list's URL identifier is not regenerated on rename, so existing links and
  the list's external import URL keep working. Changing a list's URL is out of scope.
- **Edit surface placement**: name, description, and layout editing belong together in the list's
  existing owner settings surface reached from the list page, rather than as a separate page.
- **Search source**: the existing external title catalog remains the only source for adding titles.
  Refinement means passing the user's media-type, year, and paging choices through to it — no new
  provider, no local catalog search.
- **Search defaults**: with no refinement, the add-title flow behaves as it does today (both films
  and TV, most-relevant first), so existing users see no regression.
- **Length limits**: name and description limits follow whatever the create-list flow already
  enforces, so a list created today can always be renamed to an equally long name.
- **Scope boundary**: this feature fixes the four reported problems. It does not change voting,
  comments, item caps, membership, invitations, imports, or list visibility.
- **Deployment**: the change ships to production through the project's normal release process once
  the full check suite passes.
