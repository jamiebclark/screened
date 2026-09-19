# Feature Specification: List Watch Timeline

**Feature Branch**: `013-list-watch-timeline`
**Created**: 2026-09-19
**Status**: Draft
**Input**: User description: "List watch timeline page. Add a new sub-page to each list (alongside the existing "Challenge history" feed) that shows a timeline of when each film on the list was watched. Each list item is plotted against a time axis by its watch date(s); when the list has a challenge date range (challengeStartsAt / challengeEndsAt), the timeline is bounded to that range and only watches inside it count. Lists without a date range use the span of actual watches. The view should read chronologically (oldest first) as a visual timeline rather than a reverse-chronological feed, and it should respect the list's visibility tiers and the "hide watched"/hidden-item rules already in place. Works at phone width and desktop."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the list unfold over time (Priority: P1)

A list member opens the list's **Timeline** page and sees every title on the list laid out in the order it was first watched, oldest first, along a visual time axis. Each entry shows the title's poster, name, and year, the date it was first watched, and which members watched it. The member can scan from the top (the start) to the bottom (the most recent watch) and understand how the group has progressed through the list.

**Why this priority**: This is the whole feature. The existing "Challenge history" page answers "what happened most recently?"; the timeline answers "how did we get through this list?" — a title-centric, chronological view.

**Independent Test**: Create a list with three titles, log watches on different dates, open the Timeline page, and confirm the titles appear once each in date order with the correct first-watched date and watcher(s).

**Acceptance Scenarios**:

1. **Given** a list with titles that members have watched on different dates, **When** a member opens the Timeline page, **Then** each watched title appears exactly once, ordered from the earliest first-watch date to the latest.
2. **Given** a title watched by more than one member (or watched more than once), **When** a member views the timeline, **Then** the title is positioned at its earliest qualifying watch and the entry lists every member who watched it with each member's watch date.
3. **Given** a title on the list that is a TV show, **When** any episode of it (or the show itself) has been watched, **Then** the show appears on the timeline at its earliest qualifying watch, the same as a film.
4. **Given** the timeline has entries spanning more than one month, **When** a member scrolls it, **Then** month boundaries are visibly marked along the axis so the reader can tell how the watches are spread over time.
5. **Given** a list whose titles have not been watched by any member, **When** a member opens the Timeline page, **Then** a short empty-state message explains that nothing has been watched yet and links back to the list.

---

### User Story 2 - Timeline respects the list's date range (Priority: P1)

A list with a challenge date range (a start date, an end date, or both) shows a timeline bounded to that range. The axis starts at the range's start date and ends at its end date; only watches inside the range count. Watches of a listed title that happened before the start or after the end are not plotted. A list with no date range spans from the earliest to the latest actual watch.

**Why this priority**: Challenge lists are the main reason someone wants a timeline — "did we watch all 31 horror films in October?" Showing pre-challenge watches would misrepresent progress.

**Independent Test**: Create a list with a date range, log one watch inside the range and one before it, open the Timeline page, and confirm only the in-range watch appears and the axis is labelled with the range's start and end.

**Acceptance Scenarios**:

1. **Given** a list with both a start and end date, **When** a member opens the Timeline page, **Then** the page shows the date range in the heading area and the axis is anchored at the start date and the end date.
2. **Given** a list with a date range and a title watched before the start date, **When** the timeline is viewed, **Then** that watch is not plotted; if the title has no other in-range watch it is treated as not yet watched.
3. **Given** a list with only a start date (or only an end date), **When** the timeline is viewed, **Then** the bounded side is anchored at that date and the open side extends to the latest (or earliest) actual in-range watch.
4. **Given** a list with a date range that is still in progress, **When** the timeline is viewed, **Then** a "today" marker is shown on the axis so the reader can see how much of the window has elapsed.
5. **Given** a list with no date range, **When** the timeline is viewed, **Then** the axis spans from the earliest watch of any listed title to the most recent one, and no range is shown in the heading.

---

### User Story 3 - See what is still unwatched (Priority: P2)

Below the timeline, the member sees a compact group of the list's titles that have no qualifying watch yet, with a count, so the timeline doubles as a progress view.

**Why this priority**: Useful for challenge lists but secondary to the timeline itself; the feature is valuable without it.

**Independent Test**: Create a list with two watched and one unwatched title; the unwatched title appears only in the trailing "Not watched yet" group with count 1.

**Acceptance Scenarios**:

1. **Given** a list where some titles have no qualifying watch, **When** the Timeline page is viewed, **Then** those titles are shown after the timeline in a group headed "Not watched yet" with a count, in the list's own order.
2. **Given** a list where every title has a qualifying watch, **When** the Timeline page is viewed, **Then** the "Not watched yet" group is not shown.
3. **Given** a list item that has been hidden by a curator, **When** the Timeline page is viewed, **Then** the hidden item appears neither on the timeline nor in the "Not watched yet" group.

---

### User Story 4 - Reach the timeline from the list (Priority: P2)

From the list page, a member can navigate to the Timeline page in one action, alongside the existing link to Challenge history, and return to the list from the Timeline page.

**Why this priority**: Discoverability. Without an entry point the page is effectively hidden.

**Independent Test**: Open a list as a member, activate the Timeline entry point, land on the Timeline page, and follow the back link to return to the list.

**Acceptance Scenarios**:

1. **Given** a member viewing a list, **When** they look where the Challenge history link is offered, **Then** a Timeline link is offered next to it.
2. **Given** a member on the Timeline page, **When** they follow the back link, **Then** they return to the list page.
3. **Given** a logged-out visitor viewing a public list, **When** they view the list page, **Then** no Timeline link is shown to them.

---

### User Story 5 - Only list members can see the timeline (Priority: P1)

The timeline reveals which members watched which titles and when. Only the list's owner and members can open it. Anyone else — a signed-in non-member on a site-members list, or a logged-out visitor on a public list — is sent to the list page (or to sign in) rather than shown the timeline.

**Why this priority**: Privacy. Watch data is shared with fellow list members by virtue of membership, never with the general public.

**Independent Test**: Open the Timeline URL of a public list in a private browser window; confirm it redirects to sign in. Open it as a signed-in non-member; confirm it redirects to the list page.

**Acceptance Scenarios**:

1. **Given** a logged-out visitor, **When** they open a list's Timeline URL, **Then** they are redirected to sign in and returned to the Timeline page after signing in.
2. **Given** a signed-in user who is not a member of the list, **When** they open the Timeline URL, **Then** they are redirected to the list page.
3. **Given** a list that does not exist, **When** anyone opens its Timeline URL, **Then** they see the standard not-found page.

---

### Edge Cases

- A title watched on the same day by several members: one entry, positioned on that day, listing all watchers.
- Two titles first-watched on the same day: both appear under that day, in the order they were watched (time of day), then by title.
- A watch logged with a future date inside the challenge window: plotted where it falls; the "today" marker sits before it.
- A list with exactly one qualifying watch and no date range: the axis collapses to a single day, which is displayed without error.
- A very long list (hundreds of titles) with many watches: the page still renders every entry (no arbitrary cap) and remains readable; the "Not watched yet" group stays compact.
- A list whose date range ended in the past: the axis is anchored at the end date and no "today" marker is shown.
- A list whose date range has not started yet: the timeline shows the range and an empty state noting that the challenge has not started.
- Phone width (~390px): entries stack vertically with the axis on the left; nothing scrolls horizontally.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a Timeline page for every list, reachable from the list page for members and via a stable URL alongside the list's existing history page.
- **FR-002**: The Timeline page MUST be viewable only by the list's owner and members; logged-out visitors MUST be redirected to sign in (with return to the Timeline page), and signed-in non-members MUST be redirected to the list page. Unknown lists MUST return not-found.
- **FR-003**: The timeline MUST show each non-hidden list title at most once, positioned at its earliest qualifying watch, ordered oldest first.
- **FR-004**: A "qualifying watch" is any watch of a listed title by the list's owner or a member — a film watch, a TV-show watch, or a TV episode watch — that falls inside the list's date range when one is set, or any such watch when no range is set.
- **FR-005**: Each timeline entry MUST display the title's poster (or a placeholder), name, release year, first-watched date, and every member who watched it with each member's watch date.
- **FR-006**: The timeline axis MUST be anchored to the list's date range when one is set (start date, end date, or both); when a bound is absent the axis MUST extend to the earliest/latest qualifying watch instead.
- **FR-007**: The Timeline page MUST display the list's date range in its heading area when one is set, using the same wording as the history page.
- **FR-008**: The timeline MUST mark month boundaries along the axis whenever the axis spans more than one calendar month.
- **FR-009**: The timeline MUST show a "today" marker when today falls inside the axis span.
- **FR-010**: The Timeline page MUST show a "Not watched yet" group listing the non-hidden titles with no qualifying watch, with a count, in the list's display order; the group MUST be omitted when empty.
- **FR-011**: Hidden list items MUST be excluded from both the timeline and the "Not watched yet" group.
- **FR-012**: The Timeline page MUST show a clear empty state when no title has a qualifying watch, distinguishing "nothing watched in this window" from "nothing watched yet".
- **FR-013**: The list page MUST offer a Timeline link next to the Challenge history link for members, and MUST NOT show it to logged-out visitors.
- **FR-014**: The Timeline page MUST work at phone width (~390px) and desktop without horizontal page scrolling.
- **FR-015**: The Timeline page MUST show a loading state that mirrors its final layout while data is being fetched.

### Key Entities

- **List**: The collection being viewed; carries an optional date range (start and/or end) and a set of members.
- **List item**: A title (film or TV show) on the list; may be hidden by a curator.
- **Qualifying watch**: A member's watch of a listed title that falls inside the list's date range (or any watch when no range is set). Multiple qualifying watches may exist per title.
- **Timeline entry**: One per watched title — the title, its first qualifying watch date, and the set of (member, watch date) pairs behind it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A member can open the Timeline page from a list and identify the first and most recent watched title within 5 seconds of the page loading.
- **SC-002**: For a list with a date range, 100% of watches plotted fall inside the range, and 100% of in-range watches by members are represented.
- **SC-003**: Every non-hidden list title appears exactly once — either on the timeline or in the "Not watched yet" group — for 100% of lists.
- **SC-004**: The Timeline page renders fully within 2 seconds for a list of 200 titles with 500 watches.
- **SC-005**: No logged-out visitor or non-member can view a timeline: 100% of such attempts are redirected.
- **SC-006**: The page passes the phone-width and desktop layout check with no horizontal overflow.

## Assumptions

- Membership in a list is the consent to share watches of the list's titles with fellow members (the existing rule for Challenge history), so the Timeline page has the same members-only audience and is not part of the anonymous public-list view.
- A title is anchored at its **earliest** qualifying watch; later watches by other members are shown on the same entry rather than as separate entries. This keeps the timeline title-centric, which is what distinguishes it from the history feed.
- TV shows count as watched when the show itself or any of its episodes is watched; per-episode detail is not plotted individually on the timeline.
- The per-viewer "hide watched" toggle on the list page is a filter over the list grid and does not apply to the timeline; the timeline is about watched titles by definition. Curator-hidden items are excluded.
- Date-range bounds follow the existing challenge-window convention: the start date is inclusive from the start of that day and the end date is inclusive through the end of that day.
- No new data is stored; the timeline is derived from existing list items, member watches, and episode watches.
- The timeline reads vertically (axis down the side, entries stacked) at all widths; a horizontal chart is out of scope.
