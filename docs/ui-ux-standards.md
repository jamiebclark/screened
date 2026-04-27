# UI & UX standards (Screened)

Living reference for page layout, typography, and component patterns so detail pages, lists, and tools feel like one product. We borrow tone from **Letterboxd** (film-first typography, poster weight, uncluttered copy) and **Netflix** (strong hero, clear primary actions, scannable rows).

## Content hierarchy

1. **Hero / identity** — Backdrop, title, and core metadata. One focal column; avoid duplicating the same fact in many places.
2. **Primary actions** — Status, add to list, and rating: one clear row of controls next to the title block.
3. **Sections** — Main blocks (e.g. “External links”, “Your lists”, “Watch history”) are peers: same heading level and weight. **Do not** wrap a whole stack of them in a single bordered “card” unless every peer on the page does the same.

## Section headings

- **Primary section title:** `h3` with `text-base font-semibold` (e.g. “Watch history”, “External links”, “Your lists” when the user has list memberships to show).
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

## Loading, empty, and error states

- **Loading** — Prefer route-level `loading.tsx` or section-level skeletons that mirror the final layout (avoid a generic spinner-only page when the screen has a known structure). Keep skeleton density calm; match **Letterboxd-style** lightness.
- **Empty** — Short, human copy; one primary action when it makes sense (e.g. link to search or settings). Use the same typography as section body text (`text-sm` / `text-muted-foreground` as appropriate), not a different visual language than the rest of the app.
- **Error** — User-safe message plus optional retry; do not expose stack traces or internal exception text. Reuse shared alert/toast patterns already on the screen type (e.g. `Alert` for inline, toast for async actions).

Update this doc when a new page type establishes a better pattern, so we can migrate old screens incrementally.
