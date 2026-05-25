# UI & UX standards (Screened)

Living reference for page layout, typography, and component patterns so detail pages, lists, and tools feel like one product. We borrow tone from **Letterboxd** (film-first typography, poster weight, uncluttered copy) and **Netflix** (strong hero, clear primary actions, scannable rows).

## Content hierarchy

1. **Hero / identity** — Backdrop, title, and core metadata. One focal column; avoid duplicating the same fact in many places.
2. **Primary actions** — Status, add to list, and rating: one clear row of controls next to the title block.
3. **Sections** — Main blocks (e.g. “External links”, “Your lists”, “Watch history”) are peers: same heading level and weight. **Do not** wrap a whole stack of them in a single bordered “card” unless every peer on the page does the same.

## Typography scale

Work at the broad end of the scale. Don’t creep one step at a time — jump to where the visual intent is clear.

| Role               | Classes                           | Notes                                           |
| ------------------ | --------------------------------- | ----------------------------------------------- |
| Page title (H1)    | `text-4xl font-bold`              | Every page’s primary identity anchor            |
| Named section (H2) | `text-2xl font-bold`              | Major content blocks on a page                  |
| Sub-section (H3)   | `text-xl font-semibold`           | Groups within a section                         |
| Lead / intro copy  | `text-base text-muted-foreground` | Subtitle under H1; section overview paragraphs  |
| Body               | `text-base`                       | Default prose and list content                  |
| Supporting / meta  | `text-sm text-muted-foreground`   | Counts, timestamps, captions                    |
| Micro labels       | `text-xs`                         | Use sparingly — chart ticks, icon-only controls |

## Spacing and rhythm

- **Page outer padding:** `py-12` top and bottom; `px-4` horizontal inside a `max-w-*` container.
- **Section spacing:** `space-y-16` between major page sections.
- **Stat / hero numbers:** `text-4xl font-bold` or larger — these are the data, give them room.
- **Hero moments / empty states:** Center-align with `py-16`+ vertical padding and an icon at `h-16 w-16`.
- **Page header icons:** icon containers in H1 headers use `p-3` padding, icons at `h-6 w-6`.
- **Primary CTA buttons:** Use `size=”lg”` for the primary action on any page. Reserve `size=”sm”` for secondary actions within dense layouts (sidebars, empty-state cards).

## Section headings

- **Primary section title:** `h3` with `text-xl font-semibold` (e.g. “Watch history”, “External links”, “Your lists” when the user has list memberships to show).
- **Optional count** — Sibling `span` in `text-sm font-normal text-muted-foreground` (see Watch history).
- **Plex (multiple people)** — Use a visible **`h3` “Plex”** for the group, then each item is a **small fixed-width card** with “Your Plex library” (you) or the friend’s name + “Plex library”. The row also has `aria-label` for redundancy. Do **not** use a vague umbrella like “On Screened” for unrelated groups.
- **Avoid** mixing an **uppercase + tracking** label and icon for one section, then a **sentence-case `h3`** for another on the same page. Prefer one system per surface.
- **Icons** — Don’t pair a section icon with the same icon on every child control (e.g. “external link” in the label and on each chip). For **Plex** entries that open the web app in a new tab, one **outbound** icon in the **corner of the tappable card** is enough. Use `sr-only` for “opens in new window” on the control.

## Plex library tiles

- **Width** — Constrain tiles (`w-44` or similar) and lay them out in a **wrap row** so yours and friends’ libraries sit **inline** like a set of app icons.
- **In library** — If the only action is “open in Plex,” the **whole tile is the control**; do not repeat a separate “In library” label unless the state is not obvious (e.g. not in library: copy-only tile, no `href` to Plex).
- **Not linked** — Same footprint; the whole tile can be a `Link` to settings; use a **settings** affordance, not a new-tab “external” icon, so users aren’t told the wrong target.

## External / outbound links

- **Chips** (TMDB, Letterboxd, IMDb) — Bordered, label-only is fine. Use `sr-only` “(opens in new tab)” where needed; don’t stack icons on the section title and on every link.

## Inspirations (non-prescriptive)

| Source     | What we like                                                                       |
| ---------- | ---------------------------------------------------------------------------------- |
| Letterboxd | Film poster prominence, light UI chrome, long-form log space without visual noise. |
| Netflix    | Big backdrop, one decision path, horizontal density where lists repeat.            |
| TMDB/IMDb  | Factual, link-out reference row—keep that row calm and scannable.                  |

## Title pages (movie & TV)

- **Wayfinding** — A light top line: **Search** · **Home** (`TitlePageTopNav`), not a second chrome bar.
- **Narrow viewports** — A **small poster** beside the title block (`TitlePageMobilePoster`); the large poster remains in the **side column from `sm` up** so the hero still reads.
- **Section stack** — Shared width/spacing: `titlePageSection` and `titlePageSectionStack` in `src/lib/title-page-layout.ts` with **`TitleSiteContext`** (external links + optional lists/Plex). **Movies** also stack **Watch history** in that column; **TV** does not use a separate Watch history block on the title page (episode dates and **Log** live under the **Episodes** tab).

## Where this is applied

- **Movie detail** — “External links” is a **plain section** (no outer card). **Your lists** (when any) and **Plex** sit in **`TitleSiteContext`**; **Watch history** uses the same column tokens below.
- **TV detail** — Same **External links** / lists / Plex pattern. Episode-level watched dates and logging use the **Episodes** tab (`EpisodeTracker`, `EpisodeLogDialog`), not a second Watch history section beside the hero.

## Card vs. list density

Match visual weight to expected item count. The same data can be right as a compact row or a spacious card depending on how many items a typical user will have.

| Context                     | Pattern                                           | When                                               |
| --------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Few items (≤ ~8)            | `rounded-xl border p-5`–`p-6`, `h-16 w-16` avatar | Friends, team members, saved searches, connections |
| Many items (scrolling list) | `rounded-lg border p-3`, `h-10 w-10` avatar       | Watch history, activity feed, search results       |
| Grid of media               | Poster cards with `aspect-[2/3]`                  | Title browsing, watchlists, lists                  |

**Rule**: If a reasonable user is likely to see fewer than ~8 items on screen at once, default to the spacious card pattern. Compact rows save space for long feeds — they make sparse screens feel thin and under-designed.

**During planning**: When a spec introduces a new list or collection, explicitly name the expected item count range and choose the card/row pattern before writing tasks. A task that says "render each X as a row" has already made a density decision — make it consciously.

## Loading, empty, and error states

- **Loading** — Prefer route-level `loading.tsx` or section-level skeletons that mirror the final layout (avoid a generic spinner-only page when the screen has a known structure). Keep skeleton density calm; match **Letterboxd-style** lightness.
- **Empty** — Short, human copy; one primary action when it makes sense (e.g. link to search or settings). Use the same typography as section body text (`text-sm` / `text-muted-foreground` as appropriate), not a different visual language than the rest of the app.
- **Error** — User-safe message plus optional retry; do not expose stack traces or internal exception text. Reuse shared alert/toast patterns already on the screen type (e.g. `Alert` for inline, toast for async actions).

Update this doc when a new page type establishes a better pattern, so we can migrate old screens incrementally.
