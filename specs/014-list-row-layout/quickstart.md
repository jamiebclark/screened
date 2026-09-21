# Quickstart: List Row Layout — Rank Badge & Overview Fallback

**Feature**: `014-list-row-layout` | **Date**: 2026-09-20

Validation guide for the two list-mode row changes. Design details live in
[research.md](research.md), the DOM contract in [contracts/list-row.md](contracts/list-row.md).

## Prerequisites

- Node 22, `yarn install`, a reachable Postgres in `.env` (`DATABASE_URL`), `yarn db:migrate:deploy`
  already applied (no new migration in this feature).
- `TMDB_API_KEY` set so added titles carry an `overview`.
- Dev server: `yarn dev` (Git Bash / PowerShell — see memory note: `yarn dev` fails under plain cmd).

## 1. Seed a list that exercises every row state

Log in, then (browser devtools console or Playwright `page.request`) against `http://localhost:3000`:

```
POST /api/lists
  { "name": "Row layout QA", "visibility": "MEMBERS", "rankingEnabled": true, "displayMode": "LIST" }
→ { slug }

POST /api/lists/<slug>/items  { "tmdbId": 27205, "type": "movie" }   # Inception   → no note, long overview
POST /api/lists/<slug>/items  { "tmdbId": 550,   "type": "movie" }   # Fight Club  → plain note + tags
POST /api/lists/<slug>/items  { "tmdbId": 13,    "type": "movie" }   # Forrest Gump→ spoiler note
POST /api/lists/<slug>/items  { "tmdbId": 603,   "type": "movie" }   # The Matrix  → whitespace-only note

PATCH /api/lists/<slug>/items/<fightClubId>   { "notes": "Rewatch with the commentary track." }
PATCH /api/lists/<slug>/items/<forrestGumpId> { "notes": "He runs. A lot.", "noteIsSpoiler": true }
PATCH /api/lists/<slug>/items/<matrixId>      { "notes": "   " }
```

Add a tag to Fight Club via the item modal (tag editor) so the "tags below overview / below note"
cases are both visible. Add ≥ 10 items if you want a two-digit rank; the edge case only needs one.

## 2. Visual checks (`docs/ui-ux-standards.md` → Responsive layout recipe)

Open `/lists/<slug>` at each width and confirm the table in
[contracts/list-row.md → Behavioural guarantees](contracts/list-row.md):

| Width                  | Rank                                            | Overview                          |
| ---------------------- | ----------------------------------------------- | --------------------------------- |
| 390 × 844 (`isMobile`) | bottom-right under badges; poster flush left    | **not shown** on any row          |
| 640 × 900 (`sm` edge)  | same; no overlap with vote pill / comment badge | Inception shows faded 3-line text |
| 1280 × 800             | same                                            | same; hover the row → no band     |

Also: hide Inception (hide toggle) → whole row incl. rank at 50 % opacity. Toggle ranking off in
list settings → rank disappears, nothing else moves.

Quick throwaway Playwright script (run with `yarn test:e2e -- e2e/tmp-row-layout.spec.ts`, delete
afterwards):

```ts
import { test, expect } from "@playwright/test";
import { login } from "./helpers";

for (const [w, h, isMobile] of [
  [390, 844, true],
  [640, 900, false],
  [1280, 800, false],
] as const) {
  test(`row layout @${w}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      isMobile,
    });
    const page = await ctx.newPage();
    await login(page);
    await page.goto("/lists/<slug>");
    await expect(page.getByText("Inception")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(w);
    await page.screenshot({ path: `row-layout-${w}.png`, fullPage: true });
  });
}
```

Inspect the PNGs: rank digits sit beneath the badge cluster on every row; no horizontal scroll;
overview absent at 390.

## 3. Automated gates

```bash
yarn lint
yarn test:e2e -- e2e/lists-ranked.spec.ts e2e/lists-curation.spec.ts   # must pass unmodified
yarn ci:check                                                            # before pushing
```

Expected: no failures. The "ranked list displays position numbers in list view" test still finds
`[class*="tabular-nums"]`; the curation hide/unhide test still finds `opacity-50` on the hidden row.

## 4. Commits (per research R6)

```
fix(lists): move list-row rank under the trailing badge cluster
fix(lists): show plot summary in empty list-row note slot on desktop
```

Then rebase onto `origin/main` and ff-merge per the deploy flow (semantic-release → patch).
