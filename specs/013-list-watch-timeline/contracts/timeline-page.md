# UI Contract: `/lists/[slug]/timeline`

No new API routes. The page is a Server Component; there are no mutations.

## Access

| Viewer                    | PUBLIC list     | MEMBERS list                                            | PRIVATE list                                 |
| ------------------------- | --------------- | ------------------------------------------------------- | -------------------------------------------- |
| Logged out                | 200, anonymised | 307 → `/login?callbackUrl=%2Flists%2F<slug>%2Ftimeline` | 307 → same login redirect                    |
| Signed in, not a member   | 200, anonymised | 200, anonymised                                         | 307 → `/lists/<slug>` (list page shows gate) |
| Owner or member           | 200, full       | 200, full                                               | 200, full                                    |
| Unknown slug (any viewer) | 404             | 404                                                     | 404                                          |

The edge proxy (`src/proxy.ts`) lets `GET /lists/<slug>/timeline` through unauthenticated; the page enforces the matrix via `resolveListAccess`.

## Page structure (top → bottom)

1. Back link: `← <list name>` → `/lists/<slug>`.
2. `h1` "Timeline"; when a window is set, a muted line with `describeChallengeWindow(...)` (identical wording to the history page).
3. **Timeline** (when `entries.length > 0`):
   - Left rail with the axis: a start terminal labelled with `axis.start` (e.g. "1 Sep"), the spine, month markers (`"October"` / `"October 2026"` when the year differs from the start), an optional **Today** marker, and an end terminal labelled with `axis.end`.
   - Content column: one compact row per entry — poster (`w-10 h-15`, placeholder block if none), title (link to `/movies/<tmdbId>` or `/tv/<tmdbId>`) with year, then:
     - **full**: watcher cluster — for each `watches[]` element an avatar (`h-6 w-6`) + name + date (and "· 3 episodes" when `episodeCount > 0`); wraps at phone width.
     - **anonymised**: "Watched once" / "Watched N times" in muted text; no avatars, no names.
   - Day label on the rail once per day (`Sat 3 Sep`), shared by consecutive same-day rows.
4. **Not watched yet** section (when `unwatched.length > 0`): `h3` "Not watched yet" + count in `text-sm font-normal text-muted-foreground`; compact rows (poster + title/year link) in list order.
5. Empty state (when `entries.length === 0`), dashed `rounded-xl` box with an icon and one of:
   - `windowNotStarted` → "This challenge hasn't started yet." + window description
   - window set → "Nothing watched in this window yet." + window description
   - no window → "No member has logged a watch of anything on this list yet."
     The "Not watched yet" section still renders below the empty state when the list has items.

## Accessibility / test hooks

- Timeline region: `<section aria-label="Watch timeline">`; each entry `<li>`; the rail's markers use `aria-hidden` decoration plus visible text.
- `data-testid="timeline-entry"` on each entry row; `data-testid="timeline-unwatched"` on the unwatched section.
- Header button on the list page: `aria-label="Timeline"`, `href="/lists/<slug>/timeline"`, rendered for every viewer who can see the list.

## Non-member payload guarantee

When the viewer is not the owner or a member, the RSC payload for the page contains no watcher `user` objects: the page calls `stripWatchers` before rendering, so `name`/`avatarUrl` of members are absent from the HTML/RSC stream (asserted in Playwright by checking the page content for the member's display name).
