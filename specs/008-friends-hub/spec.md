# Feature Specification: First-Class Friends Hub

**Feature Branch**: `008-friends-hub`  
**Created**: 2026-05-25  
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Friends List (Priority: P1)

A signed-in user wants to quickly see all their friends. They navigate to a dedicated Friends section from the main nav — not buried under Settings — and immediately see a list of everyone they're connected with, along with a sense of what each friend has been up to recently.

**Why this priority**: This is the foundational use case. Without a first-class friends list, all social features are invisible. Everything else builds on this.

**Independent Test**: Can be fully tested by navigating to `/friends` and verifying that accepted friends are displayed with their names and most recent watch activity.

**Acceptance Scenarios**:

1. **Given** a signed-in user with at least one accepted friend, **When** they navigate to the Friends section via the main nav, **Then** they see a list of all accepted friends, each showing the friend's name/avatar and their most recent watch activity (title + date).
2. **Given** a signed-in user with no friends yet, **When** they navigate to the Friends section, **Then** they see an empty state with a prompt and action to find and add friends.
3. **Given** a signed-in user, **When** they are on the Friends page, **Then** they see a link/tab to navigate to the full friends activity feed (the existing `/activity` page).

---

### User Story 2 - Manage Friend Requests (Priority: P2)

A signed-in user wants to act on pending friend requests — accepting or declining incoming ones, and cancelling outgoing ones they've changed their mind about.

**Why this priority**: Request management is a prerequisite for the social graph to grow. Without it, invitations pile up with no way to respond. This is the second most fundamental flow after viewing the list.

**Independent Test**: Can be tested by sending a friend request from one account and verifying accept/decline options appear on the recipient's Friends page.

**Acceptance Scenarios**:

1. **Given** a user has received a friend request, **When** they view the Friends page, **Then** they see the pending request with the sender's name and options to accept or decline.
2. **Given** a user accepts a friend request, **When** acceptance is confirmed, **Then** the sender appears in their friends list and the request disappears from the pending queue.
3. **Given** a user declines a friend request, **When** they decline, **Then** the request is removed without creating a friendship.
4. **Given** a user has sent an outgoing request that hasn't been accepted yet, **When** they view the Friends page, **Then** they can see and cancel that pending request.
5. **Given** a user has both incoming and outgoing requests, **When** they view the Friends page, **Then** the two categories are visually distinct and easy to distinguish.

---

### User Story 3 - Find and Add Friends (Priority: P3)

A signed-in user wants to connect with someone they know. They search for that person by name, username, or email and send a friend request — all from within the Friends section, without going to Settings.

**Why this priority**: Discovery completes the social loop — the friends list is only useful if users can populate it. This was previously accessible only through Settings, making it easy to miss.

**Independent Test**: Can be tested by searching for a known user from the Friends page and verifying that a friend request is sent and appears as a pending outgoing request.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the Friends page, **When** they open the "Find friends" / "Add friend" flow and search a known user's name or username, **Then** matching users appear in results (max 8) with an "Add friend" action.
2. **Given** a user who is already friends with a search result, **When** that result appears, **Then** the result shows "Already friends" and no add action is available.
3. **Given** a user who already has a pending outgoing request to a search result, **When** that result appears, **Then** the result shows "Request sent" instead of an add action.
4. **Given** a user sends a friend request from search results, **When** the request is sent, **Then** confirmation is shown and the result updates to "Request sent."
5. **Given** a user searches a term with no matching users, **When** results are returned, **Then** an empty state is shown with a human-readable "No users found" message.

---

### User Story 4 - Settings/Friends Migration (Priority: P4)

The existing `/settings/friends` page is retired. Users who navigate to it are redirected to the new `/friends` route so that bookmarks or muscle memory don't lead to dead ends.

**Why this priority**: A redirect is necessary for continuity but has no new user-facing value. It prevents broken URLs and confusion without adding surface area.

**Independent Test**: Can be tested by navigating directly to `/settings/friends` and verifying a redirect to `/friends` occurs.

**Acceptance Scenarios**:

1. **Given** any user navigates to `/settings/friends`, **When** the page loads, **Then** they are redirected to `/friends`.
2. **Given** the Settings navigation, **When** a user browses Settings, **Then** there is no "Friends" entry in the Settings menu.

---

### Edge Cases

- What happens when a user tries to add themselves as a friend?
- What happens if a user sends a friend request to someone who has already sent them a request (mutual pending)? (The existing API auto-accepts in this case — spec should preserve that behavior.)
- What happens if both users unfriend and then one re-sends a request?
- How does the friends list behave if a friend's account is deleted?
- What if a search query is empty or contains only whitespace?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a `/friends` route accessible to all signed-in users.
- **FR-002**: Main navigation MUST include a "Friends" entry that links to `/friends`.
- **FR-003**: The `/friends` page MUST display all accepted friends for the current user, including each friend's display name, avatar, and most recent watch activity.
- **FR-004**: The `/friends` page MUST display incoming friend requests with accept and decline actions.
- **FR-005**: The `/friends` page MUST display outgoing pending friend requests with a cancel action.
- **FR-006**: Accepting a friend request MUST immediately move the sender into the friends list and remove the request from the pending queue.
- **FR-007**: The `/friends` page MUST include a mechanism to search for users and send friend requests, without requiring navigation to Settings.
- **FR-008**: User search MUST match on display name, username, and email, returning up to 8 results.
- **FR-009**: Search results MUST indicate existing relationship status (already friends, request pending) and suppress the add action accordingly.
- **FR-010**: System MUST redirect `/settings/friends` to `/friends`.
- **FR-011**: The "Friends" entry MUST be removed from the Settings navigation menu.
- **FR-012**: The `/friends` page MUST include a visible link or tab to the existing friends activity feed at `/activity`.
- **FR-013**: The `/friends` page MUST show an appropriate empty state when the user has no friends yet, with a call-to-action to find friends.

### Key Entities

- **Friendship**: A mutual, accepted connection between two users. Represented by both users appearing in each other's friends list.
- **FriendRequest**: A pending, one-directional invitation. Has a sender, a recipient, and a status (pending). Either user can cancel from their side; only the recipient can accept or decline.
- **Friend Activity Snapshot**: A lightweight view of a friend's most recent watch event (title, type, date), surfaced on the friends list without requiring navigation to the full activity feed.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A signed-in user can navigate to their friends list in 1 click from any page in the app.
- **SC-002**: A signed-in user can find a known person and send a friend request in under 30 seconds without leaving the Friends section.
- **SC-003**: All existing friend relationships and pending requests are preserved after migration — zero data loss.
- **SC-004**: `/settings/friends` redirects to `/friends` with no user-visible error.
- **SC-005**: The friends list displays the correct accepted friends and request states with no stale or incorrect relationship status shown.

## Assumptions

- The mutual (bidirectional) friendship model is preserved as-is — no one-way following is introduced.
- The existing `/activity` page is not redesigned; the Friends page links to it rather than duplicating it.
- The existing user search API (`/api/users/search`) is reused as-is; no changes to search logic are required.
- Friend activity snapshots shown on the friends list are derived from existing watch history data — no new data model is needed.
- The feature is scoped to authenticated users only; no public-facing friends lists.
- "Block" and user reporting are out of scope for this feature.
- Mobile responsiveness follows existing app conventions; no dedicated mobile-only design is required.
- The Settings page's Friends link removal is a pure navigation change — the underlying settings data (profile visibility) is not affected.
