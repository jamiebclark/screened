# Feature Specification: Public List Visibility

**Feature Branch**: `012-public-list-visibility`
**Created**: 2026-09-19
**Status**: Draft
**Input**: User description: "Public lists viewable by logged-out visitors. Introduce three-tier list visibility: PUBLIC (anyone on the internet, no login required), MEMBERS (any logged-in site user — this is what today's "Public" means and existing public lists migrate to it), PRIVATE (list members only, unchanged). Owners choose the tier in list creation and list settings. Logged-out visitors get a read-only view of a PUBLIC list..."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Share a list with anyone (Priority: P1)

A list owner wants to share a link to their list — a film-club challenge, a "best of the year" ranking, a themed watchlist — with friends or on social media, including people who do not have a Screened account. The owner marks the list as **Public** and anyone who opens the link sees the list without being asked to sign in.

**Why this priority**: This is the core value of the feature. Without a read-only anonymous view, every other part (tiers, badges, copy) has nothing to expose.

**Independent Test**: Create a list, set it to Public, open its URL in a private/incognito browser window with no session. The list name, description, and items render. Every other tier still redirects to login.

**Acceptance Scenarios**:

1. **Given** a list whose visibility is Public, **When** a logged-out visitor opens the list URL, **Then** the visitor sees the list name, description, item count, and every non-hidden item with poster, title, year, and type (movie/TV).
2. **Given** a ranked Public list, **When** a logged-out visitor views it, **Then** items appear in their ranked order with rank numbers shown.
3. **Given** a Public list with tags, vote totals, and item comments, **When** a logged-out visitor views it, **Then** each item shows its tags, its aggregate vote total, and its comment count.
4. **Given** a Public list, **When** a logged-out visitor views it, **Then** no member names or avatars, no "watched by"/"watching" indicators, no per-user watched state, no integration URLs or settings, and no action controls (vote, comment, add, hide, reorder, join, request access, settings) are shown.
5. **Given** a Public list, **When** a logged-out visitor views it, **Then** a single, clearly visible prompt invites them to sign in (or register) to vote and comment, and following it returns them to the same list after signing in.
6. **Given** a Public list, **When** a logged-out visitor opens an item's detail, **Then** they see the item's own information (title, overview, notes unless marked spoiler) but cannot open or post comments, vote, or edit tags/notes.
7. **Given** a Public list with the "hide watched" or hidden-items filter, **When** a logged-out visitor views it, **Then** hidden items are excluded and sort options that depend on the viewer's watch history are not offered.

---

### User Story 2 - Choose who can see a list (Priority: P1)

A list owner creates or edits a list and picks one of three visibility levels: **Public** (anyone on the internet, even without an account), **Site members** (anyone signed in to Screened), or **Private** (only list members). The choice is explained in plain language so the owner understands exactly who will be able to see the list.

**Why this priority**: The owner must be able to opt in to true public exposure; the tier selector is the control surface for the whole feature and protects lists that should not be exposed.

**Independent Test**: Create a list with each of the three tiers; edit an existing list between tiers; confirm the persisted setting and the header badge match the chosen tier.

**Acceptance Scenarios**:

1. **Given** the new-list form, **When** the owner views the visibility choice, **Then** three options are offered — Public ("Anyone on the internet, even without an account"), Site members ("Anyone signed in to Screened"), Private ("Only list members") — with Site members preselected by default.
2. **Given** an existing list's settings, **When** the owner changes the visibility tier and saves, **Then** the list immediately enforces the new tier for all viewers and the header badge updates.
3. **Given** an owner changing a list from Public or Site members to Private, **When** they save, **Then** they are warned (as today) that non-members will lose access.
4. **Given** a non-owner member, **When** they open list settings, **Then** they cannot change the visibility tier.

---

### User Story 3 - Existing lists keep their current audience (Priority: P1)

Every list that exists before this feature ships keeps exactly the audience it has today. Lists that were "Public" (visible to any signed-in user) become **Site members**; lists that were "Private" stay **Private**. No list becomes visible to logged-out visitors without its owner explicitly choosing Public.

**Why this priority**: Silently widening exposure of existing lists would be a privacy regression. This story is what makes the three-tier design safe.

**Independent Test**: With a database containing public and private lists, apply the feature; confirm that no list resolves to Public and that each list's header badge and anonymous-access behaviour match its pre-feature audience.

**Acceptance Scenarios**:

1. **Given** a list that was "Public" before the feature, **When** the feature is deployed, **Then** its tier is Site members and a logged-out visitor is redirected to sign in.
2. **Given** a list that was "Private" before the feature, **When** the feature is deployed, **Then** its tier is Private and behaviour is unchanged.

---

### User Story 4 - Tier is visible everywhere a list appears (Priority: P2)

Wherever a list is summarised — the lists overview cards, the list page header, the "lists containing this title" section on a title page — the visibility tier is shown with a distinct icon and label so owners and members can tell at a glance whether a list is exposed to the public.

**Why this priority**: Owners need a persistent, unambiguous signal about which lists are exposed publicly. Lower than P1 because the feature functions without it, but it is required for owners to trust the setting.

**Independent Test**: Create one list per tier; confirm each surface shows the right icon and label for each.

**Acceptance Scenarios**:

1. **Given** lists of each tier, **When** a signed-in user views the lists overview, **Then** each card shows a tier badge with a distinct icon and the labels "Public", "Site members", or "Private".
2. **Given** a list page, **When** any viewer (including logged-out) opens it, **Then** the header shows the tier badge.

---

### User Story 5 - Integrations and data access follow the same rules (Priority: P2)

Anything that reads a list on behalf of a caller — the list data endpoint, the Radarr feed — enforces the same tiers as the page: Public readable by anyone, Site members readable by any signed-in user, Private readable only by list members (or via the list's existing secret token for Radarr).

**Why this priority**: Consistency between the page and the machine-readable endpoints prevents a Site-members list from leaking through an unauthenticated data path, and lets Public lists work with third-party tools without a token.

**Independent Test**: Call the list data endpoint and the Radarr feed for each tier with and without a session; confirm access matches the matrix in FR-010.

**Acceptance Scenarios**:

1. **Given** a Public list, **When** the list data endpoint is requested with no session, **Then** the list is returned with the same anonymous-safe fields as the page (no member details, no per-user state, no integration secrets).
2. **Given** a Site-members list, **When** the list data endpoint is requested with no session, **Then** the request is rejected as unauthenticated.
3. **Given** a Private list, **When** the Radarr feed is requested with no token and no membership, **Then** the request is rejected; **When** requested with the list's token, **Then** it succeeds as today.
4. **Given** a Site-members list, **When** the Radarr feed is requested with no token and no session, **Then** the request is rejected; **When** requested with the list's token, **Then** it succeeds.

---

### Edge Cases

- A logged-out visitor opens a Site-members or Private list URL → redirected to sign in, and after signing in they land back on that list (Site members) or on the existing "request access" gate (Private).
- A logged-out visitor opens a Public list that does not exist → standard not-found page, not a login redirect.
- An owner switches a list from Public to Private while a logged-out visitor has the page open → the next navigation or refresh redirects the visitor to sign in.
- A Public list has zero items → the anonymous view shows the same "No items yet" empty state as members see, with no "add" affordance.
- A Public list has every item hidden → the anonymous view shows the "no visible items" state without the toggle to include hidden items (hidden items are never exposed anonymously).
- An item note is marked as a spoiler → the anonymous view blurs/withholds it the same way it does for signed-in non-owners.
- A signed-in user who is not a list member opens a Public list → they get today's signed-in non-member experience (can see members, can vote/comment only if they join per existing rules); anonymous restrictions do not apply to them.
- A Public list's owner account is deactivated or deleted → the list follows the existing ownership rules; visibility tier is unaffected.
- Search engines and link previews → a Public list may be indexed and unfurled; Site-members and Private lists must never expose title or description to unauthenticated fetches beyond what the login redirect reveals.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Each list MUST have exactly one visibility tier: Public, Site members, or Private.
- **FR-002**: Owners MUST be able to choose the tier when creating a list; the default for new lists MUST be Site members.
- **FR-003**: Owners MUST be able to change the tier from list settings; non-owners MUST NOT be able to change it.
- **FR-004**: On rollout, every list previously marked "public" MUST become Site members and every list previously marked "private" MUST remain Private. No list may become Public without an explicit owner action after rollout.
- **FR-005**: A logged-out visitor MUST be able to view a Public list page without being redirected to sign in.
- **FR-006**: A logged-out visitor MUST be redirected to sign in (preserving the return path) when opening a Site-members or Private list.
- **FR-007**: The anonymous view of a Public list MUST include: list name, description, item count, tier badge, and every non-hidden item's poster, title, year, type, rank (when ranking is on), tags, aggregate vote total, comment count, added date, and non-spoiler notes.
- **FR-008**: The anonymous view MUST NOT include: member names/avatars/count details, "watched by"/"watching" indicators, per-viewer watched state, integration URLs or tokens, connected-channel details, hidden items, or any control that mutates the list (vote, comment, add, hide/unhide, reorder, delete, tag/notes editing, join, request access, settings).
- **FR-009**: The anonymous view MUST present one sign-in prompt that, when followed, returns the visitor to the same list after authentication.
- **FR-010**: Machine-readable list access MUST enforce the tier matrix:

  | Tier         | No session                  | Signed in, not a member | List member |
  | ------------ | --------------------------- | ----------------------- | ----------- |
  | Public       | Read (anonymous-safe shape) | Read                    | Read/write  |
  | Site members | Reject (unauthenticated)    | Read                    | Read/write  |
  | Private      | Reject (unauthenticated)    | Reject (forbidden)      | Read/write  |

  The Radarr feed additionally accepts the list's secret token as a substitute for a session/membership, as it does today.

- **FR-011**: Every list summary surface (list cards, list page header, title-page "in lists" section) MUST display the tier with a distinct icon per tier and the labels "Public", "Site members", "Private".
- **FR-012**: Owner-facing tier descriptions MUST read: Public — "Anyone on the internet, even without an account"; Site members — "Anyone signed in to Screened"; Private — "Only list members".
- **FR-013**: The Public tier MUST NOT expand the set of actions available to signed-in non-members; their experience is unchanged from today's public list.
- **FR-014**: Sort and filter options offered to a logged-out visitor MUST exclude any that depend on the viewer's own watch history or membership.
- **FR-015**: The anonymous list page MUST render inside the site's public frame (navigation with sign-in/register affordances, footer), consistent with other pages available to logged-out visitors.

### Key Entities

- **List**: A curated collection of titles owned by one user. Gains a **visibility tier** (Public / Site members / Private) replacing the current two-state public flag. Retains name, description, slug, ranking/voting/comment settings, display mode, item cap, challenge window, and integration settings.
- **List visibility tier**: Enumerated audience for a list. Determines who may view the list page and read it through machine-readable endpoints. Public = anyone; Site members = any authenticated account; Private = owner and list members only.
- **Viewer context**: The relationship between the person requesting a list and the list — anonymous, signed-in non-member, member, or owner. Governs which fields and controls are rendered.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A person with no account can open a shared Public list link and see its items within a single page load, with no sign-in interstitial.
- **SC-002**: 100% of lists that were "public" before rollout are Site members after rollout; 0 lists are Public until an owner chooses it.
- **SC-003**: For every tier, unauthenticated requests to the list page and both machine-readable endpoints match the FR-010 matrix in automated tests (page, data endpoint, Radarr feed × 3 tiers × 3 viewer contexts).
- **SC-004**: The anonymous view exposes none of the fields listed in FR-008 (verified by automated assertion on the rendered page and endpoint response).
- **SC-005**: An owner can switch a list between any two tiers from settings in under 10 seconds, and the header badge reflects the change immediately after save.
- **SC-006**: The anonymous list page passes the project's responsive check at phone width (~390px) and desktop with no horizontal scroll.

## Assumptions

- "Site members" is the new name for what the product currently calls "Public"; existing user-facing copy that says "Public — Anyone can view" is replaced, not kept alongside.
- The default tier for newly created lists is Site members (matching today's default of "public"), so creating a list does not expose it to the internet by accident.
- Anonymous visitors see aggregate vote totals and comment counts but not individual votes, voter identities, or comment bodies (read-only view, per the owner's choice during scoping).
- The item detail modal is available anonymously in a reduced form; anything that requires an account (comment threads, voting, editing) is omitted rather than shown disabled.
- The existing secret-token mechanism for Radarr feeds remains the way to consume non-Public lists from third-party tools; Public lists need no token.
- The "request access" flow remains limited to Private lists and signed-in users; there is no anonymous request-access flow.
- Search-engine indexing of Public lists is acceptable to owners who choose Public; no additional opt-out control is in scope for this feature.
- No public listing/discovery page of all Public lists is in scope; Public lists are reachable by direct link only.
