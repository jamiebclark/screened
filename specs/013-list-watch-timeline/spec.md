# Feature Specification: List Watch Timeline

**Feature Branch**: `013-list-watch-timeline`
**Created**: 2026-09-19
**Status**: Implemented
**Input**: User description: "List watch timeline page. Add a new sub-page to each list (alongside the existing "Challenge history" feed) that shows a timeline of when each film on the list was watched. Each list item is plotted against a time axis by its watch date(s); when the list has a challenge date range (challengeStartsAt / challengeEndsAt), the timeline is bounded to that range and only watches inside it count. Lists without a date range use the span of actual watches. The view should read chronologically (oldest first) as a visual timeline rather than a reverse-chronological feed, and it should respect the list's visibility tiers and the "hide watched"/hidden-item rules already in place. Works at phone width and desktop."

## Clarifications

### Session 2026-09-19

- Q: How should the timeline be laid out? → A: Vertical timeline — axis down the left side, entries stacked, month markers on the spine; same layout at phone and desktop width.
- Q: Who can open a list's Timeline page? → A: Anyone who can see the list (it follows the list's visibility tier), but only the list's owner and members see _who_ watched each title; other viewers see an anonymised timeline with dates only.
- Q: When a title has several qualifying watches, how should it appear? → A: One entry per title, positioned at its **latest** qualifying watch; the entry lists every watch behind it.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the list unfold over time (Priority: P1)

A viewer opens the list's **Timeline** page and sees every watched title on the list laid out along a vertical time axis, oldest first. Each entry shows the title's poster, name, and year, and the date of its most recent qualifying watch. List members additionally see which members watched it and when. The viewer can scan from the top (the start) to the bottom (the most recent watch) and understand how the list has been worked through over time.

**Why this priority**: This is the whole feature. The existing "Challenge history" page answers "what happened most recently?"; the timeline answers "how did we get through this list?" — a title-centric, chronological view.

**Independent Test**: Create a list with three titles, log watches on different dates, open the Timeline page, and confirm the titles appear once each in date order at the correct date.

**Acceptance Scenarios**:

1. **Given** a list with titles that members have watched on different dates, **When** a viewer opens the Timeline page, **Then** each watched title appears exactly once, ordered from the earliest anchor date to the latest.
2. **Given** a title watched by more than one member (or watched more than once), **When** the timeline is viewed, **Then** the title is positioned at its **latest** qualifying watch; a list member sees every watcher with each one's watch date on that entry, while a non-member sees only the anchor date and how many times it was watched.
3. **Given** a title on the list that is a TV show, **When** any episode of it (or the show itself) has been watched, **Then** the show appears on the timeline at its latest qualifying watch, the same as a film.
4. **Given** the timeline has entries spanning more than one month, **When** a viewer scrolls it, **Then** month boundaries are visibly marked along the axis so the reader can tell how the watches are spread over time.
5. **Given** a list whose titles have not been watched by any member, **When** a viewer opens the Timeline page, **Then** a short empty-state message explains that nothing has been watched yet and links back to the list.

---

### User Story 2 - Timeline respects the list's date range (Priority: P1)

A list with a challenge date range (a start date, an end date, or both) shows a timeline bounded to that range. The axis starts at the range's start date and ends at its end date; only watches inside the range count. Watches of a listed title that happened before the start or after the end are not plotted. A list with no date range spans from the earliest to the latest actual watch.

**Why this priority**: Challenge lists are the main reason someone wants a timeline — "did we watch all 31 horror films in October?" Showing pre-challenge watches would misrepresent progress.

**Independent Test**: Create a list with a date range, log one watch inside the range and one before it, open the Timeline page, and confirm only the in-range watch appears and the axis is labelled with the range's start and end.

**Acceptance Scenarios**:

1. **Given** a list with both a start and end date, **When** a viewer opens the Timeline page, **Then** the page shows the date range in the heading area and the axis is anchored at the start date and the end date.
2. **Given** a list with a date range and a title watched before the start date, **When** the timeline is viewed, **Then** that watch is not plotted; if the title has no other in-range watch it is treated as not yet watched.
3. **Given** a list with only a start date (or only an end date), **When** the timeline is viewed, **Then** the bounded side is anchored at that date and the open side extends to the latest (or earliest) actual in-range watch.
4. **Given** a list with a date range that is still in progress, **When** the timeline is viewed, **Then** a "today" marker is shown on the axis so the reader can see how much of the window has elapsed.
5. **Given** a list with no date range, **When** the timeline is viewed, **Then** the axis spans from the earliest watch of any listed title to the most recent one, and no range is shown in the heading.

---

### User Story 3 - See what is still unwatched (Priority: P2)

Below the timeline, the viewer sees a compact group of the list's titles that have no qualifying watch yet, with a count, so the timeline doubles as a progress view.

**Why this priority**: Useful for challenge lists but secondary to the timeline itself; the feature is valuable without it.

**Independent Test**: Create a list with two watched and one unwatched title; the unwatched title appears only in the trailing "Not watched yet" group with count 1.

**Acceptance Scenarios**:

1. **Given** a list where some titles have no qualifying watch, **When** the Timeline page is viewed, **Then** those titles are shown after the timeline in a group headed "Not watched yet" with a count, in the list's own order.
2. **Given** a list where every title has a qualifying watch, **When** the Timeline page is viewed, **Then** the "Not watched yet" group is not shown.
3. **Given** a list item that has been hidden by a curator, **When** the Timeline page is viewed, **Then** the hidden item appears neither on the timeline nor in the "Not watched yet" group.

---

### User Story 4 - Reach the timeline from the list (Priority: P2)

From the list page, anyone who can see the list can navigate to the Timeline page in one action, and return to the list from the Timeline page. Members see it alongside the existing Challenge history link.

**Why this priority**: Discoverability. Without an entry point the page is effectively hidden.

**Independent Test**: Open a list, activate the Timeline entry point, land on the Timeline page, and follow the back link to return to the list.

**Acceptance Scenarios**:

1. **Given** a member viewing a list, **When** they look where the Challenge history link is offered, **Then** a Timeline link is offered next to it.
2. **Given** a non-member (signed in, or a logged-out visitor on a Public list) viewing a list, **When** they view the list page, **Then** a Timeline link is offered to them as well.
3. **Given** a viewer on the Timeline page, **When** they follow the back link, **Then** they return to the list page.

---

### User Story 5 - Timeline access follows list visibility (Priority: P1)

The Timeline page is visible to exactly the people who can see the list: a Public list's timeline is open to logged-out visitors, a Site-members list's timeline to any signed-in user, and a Private list's timeline to its members only. Because the timeline reveals members' watch activity, only the list's owner and members see who watched each title; every other viewer sees an anonymised timeline — the same titles at the same dates, with no member names, avatars, or per-member dates.

**Why this priority**: Privacy. Watch data is shared with fellow list members by virtue of membership; the wider audience may see that a list is being watched through, but never which person watched what.

**Independent Test**: Open the Timeline URL of a Public list in a private browser window; confirm the timeline renders with dates but no member names. Open the Timeline URL of a Private list as a non-member; confirm it redirects like the list page does. Open it as a member; confirm watcher names appear.

**Acceptance Scenarios**:

1. **Given** a Public list, **When** a logged-out visitor opens its Timeline URL, **Then** the timeline renders with titles and dates and no member identities, and no watcher details are present in the page.
2. **Given** a Site-members list, **When** a logged-out visitor opens its Timeline URL, **Then** they are redirected to sign in and returned to the Timeline page after signing in; a signed-in non-member sees the anonymised timeline.
3. **Given** a Private list, **When** a non-member opens its Timeline URL, **Then** they are handled exactly as they would be on the list page itself (redirected or gated), and see no timeline data.
4. **Given** any list, **When** its owner or a member opens the Timeline URL, **Then** each entry shows every watcher's name and avatar with that watcher's date.
5. **Given** a list that does not exist, **When** anyone opens its Timeline URL, **Then** they see the standard not-found page.

---

### Edge Cases

- A title watched on the same day by several members: one entry, positioned on that day; members see all watchers listed.
- Two titles anchored on the same day: both appear under that day, in the order they were watched (time of day), then by title.
- A title watched inside the range and again after the range ended: anchored at its latest **in-range** watch; the out-of-range watch is ignored.
- A watch logged with a future date inside the challenge window: plotted where it falls; the "today" marker sits before it.
- A list with exactly one qualifying watch and no date range: the axis collapses to a single day, which is displayed without error.
- A very long list (hundreds of titles) with many watches: the page still renders every entry (no arbitrary cap) and remains readable; the "Not watched yet" group stays compact.
- A list whose date range ended in the past: the axis is anchored at the end date and no "today" marker is shown.
- A list whose date range has not started yet: the timeline shows the range and an empty state noting that the challenge has not started.
- Phone width (~390px): entries stack vertically with the axis on the left; nothing scrolls horizontally.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a Timeline page for every list, reachable from the list page and via a stable URL alongside the list's existing history page.
- **FR-002**: Access to the Timeline page MUST follow the list's visibility tier exactly as the list page does: Public lists are open to logged-out visitors; Site-members lists require sign-in (logged-out visitors are redirected to sign in and returned to the Timeline page); Private lists are limited to members. Unknown lists MUST return not-found.
- **FR-003**: The timeline MUST show each non-hidden list title at most once, positioned at its **latest** qualifying watch, ordered oldest first.
- **FR-004**: A "qualifying watch" is any watch of a listed title by the list's owner or a member — a film watch, a TV-show watch, or a TV episode watch — that falls inside the list's date range when one is set, or any such watch when no range is set.
- **FR-005**: Each timeline entry MUST display the title's poster (or a placeholder), name, release year, and anchor date. For the list's owner and members the entry MUST also list every qualifying watch with the watcher's name, avatar, and date. For every other viewer the entry MUST show only the anchor date and the number of qualifying watches, and the page MUST NOT contain member names, avatars, or per-member dates.
- **FR-006**: The timeline axis MUST be anchored to the list's date range when one is set (start date, end date, or both); when a bound is absent the axis MUST extend to the earliest/latest qualifying watch instead.
- **FR-007**: The Timeline page MUST display the list's date range in its heading area when one is set, using the same wording as the history page.
- **FR-008**: The timeline MUST mark month boundaries along the axis whenever the axis spans more than one calendar month.
- **FR-009**: The timeline MUST show a "today" marker when today falls inside the axis span.
- **FR-010**: The Timeline page MUST show a "Not watched yet" group listing the non-hidden titles with no qualifying watch, with a count, in the list's display order; the group MUST be omitted when empty.
- **FR-011**: Hidden list items MUST be excluded from both the timeline and the "Not watched yet" group.
- **FR-012**: The Timeline page MUST show a clear empty state when no title has a qualifying watch, distinguishing "nothing watched in this window" from "nothing watched yet".
- **FR-013**: The list page MUST offer a Timeline link to everyone who can see the list; for members it MUST sit next to the Challenge history link.
- **FR-014**: The Timeline page MUST use a vertical layout — axis down one side, entries stacked — and MUST work at phone width (~390px) and desktop without horizontal page scrolling.
- **FR-015**: The Timeline page MUST show a loading state that mirrors its final layout while data is being fetched.

### Key Entities

- **List**: The collection being viewed; carries a visibility tier, an optional date range (start and/or end), and a set of members.
- **List item**: A title (film or TV show) on the list; may be hidden by a curator.
- **Qualifying watch**: A member's watch of a listed title that falls inside the list's date range (or any watch when no range is set). Multiple qualifying watches may exist per title.
- **Timeline entry**: One per watched title — the title, its anchor date (latest qualifying watch), and the set of (member, watch date) pairs behind it. Members see the pairs; other viewers see only their count.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A viewer can open the Timeline page from a list and identify the first and most recent watched title within 5 seconds of the page loading.
- **SC-002**: For a list with a date range, 100% of watches plotted fall inside the range, and 100% of in-range watches by members are represented.
- **SC-003**: Every non-hidden list title appears exactly once — either on the timeline or in the "Not watched yet" group — for 100% of lists.
- **SC-004**: The Timeline page renders fully within 2 seconds for a list of 200 titles with 500 watches.
- **SC-005**: Access decisions match the list page for 100% of (list tier, viewer) combinations, and 0 member names, avatars, or per-member dates reach a non-member's page.
- **SC-006**: The page passes the phone-width and desktop layout check with no horizontal overflow.

## Assumptions

- Membership in a list is the consent to share watches of the list's titles with fellow members (the existing rule for Challenge history). Non-members may learn that a title on the list was watched on a given date, but never by whom.
- TV shows count as watched when the show itself or any of its episodes is watched; per-episode detail is not plotted individually on the timeline.
- The per-viewer "hide watched" toggle on the list page is a filter over the list grid and does not apply to the timeline; the timeline is about watched titles by definition. Curator-hidden items are excluded.
- Date-range bounds follow the existing challenge-window convention: the start date is inclusive from the start of that day and the end date is inclusive through the end of that day.
- No new data is stored; the timeline is derived from existing list items, member watches, and episode watches.
- The existing Challenge history page keeps its current members-only audience; this feature does not change it.
