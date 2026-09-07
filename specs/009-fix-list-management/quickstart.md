# Quickstart: Fix List Management

**Feature**: `009-fix-list-management` | **Branch**: `009-fix-list-management`

How to run, verify, and reproduce-then-confirm each of the four fixes. Everything here works against
the normal dev stack — no new env vars, no migration, no seed script.

## Prerequisites

```bash
# .env must contain a reachable Postgres and a TMDB key
#   DATABASE_URL=postgresql://…
#   AUTH_SECRET=…
#   TMDB_API_KEY=…            (v4 bearer token — required for the search work)
yarn install
yarn db:migrate               # no new migration in this feature; brings dev DB up to date
yarn dev                      # http://localhost:3000
```

No `yarn db:generate` is needed — the Prisma schema is untouched.

## Fixture: a ranked list that reproduces the reorder bug

The bug only shows on a ranked list whose items span media types **or** include something the viewer
has watched. Create one via the API (logged in, from the browser console or `curl` with the session
cookie):

```bash
# 1. ranked list, list layout
curl -s -X POST localhost:3000/api/lists -H 'Content-Type: application/json' \
  -d '{"name":"Reorder repro","isPublic":true,"rankingEnabled":true,"displayMode":"LIST"}'
# → { "slug": "reorder-repro", … }

# 2. one movie + one TV show (mixed types is what triggers the regrouping)
curl -s -X POST localhost:3000/api/lists/reorder-repro/items \
  -H 'Content-Type: application/json' -d '{"tmdbId":27205,"type":"movie"}'   # Inception
curl -s -X POST localhost:3000/api/lists/reorder-repro/items \
  -H 'Content-Type: application/json' -d '{"tmdbId":1396,"type":"tv"}'       # Breaking Bad
curl -s -X POST localhost:3000/api/lists/reorder-repro/items \
  -H 'Content-Type: application/json' -d '{"tmdbId":550,"type":"movie"}'     # Fight Club
```

## Verify each fix by hand

### US1 — reorder persists (FR-001 – FR-007)

1. Open `/lists/reorder-repro`. Ranks read `1, 2, 3`.
2. Drag **Fight Club** (rank 3) to the top.
3. **Before the fix**: reload → Breaking Bad has jumped to the bottom (TV grouped after movies) and
   the order you dragged is gone.
   **After the fix**: reload → the dragged order holds, ranks read `1, 2, 3` top to bottom.
4. Mark one item `WATCHED` from its modal, reload → it stays in place (it is no longer moved into a
   "Watched" group).
5. Sign in as a second user, add them as a member with role `VIEWER`, open the list → no drag handle,
   same order.
6. Break the save (DevTools → Network → block `*/items/reorder`), drag → the row snaps back and a
   message appears above the list.

### US2 — rename and description (FR-008 – FR-014)

1. Open the list → gear icon → **Settings** tab. Name and description fields are at the top.
2. Change both, **Save settings** → the `h1` and the paragraph under it update without a reload, and
   `/lists` shows the new name.
3. Clear the name and save → rejected with "List name is required"; the old name is still there.
4. Paste 150 characters into the name → rejected with the 100-character limit message.
5. Clear the description and save → the paragraph disappears; nothing else shifts.
6. The URL is unchanged after the rename — `/lists/reorder-repro` still resolves.
7. As a `CONTRIBUTOR`, open the gear → the Settings tab is not offered; a direct
   `PATCH /api/lists/reorder-repro` returns `403`.

### US3 — refinable add-title search (FR-020 – FR-028)

1. Open the list → **+** → type `House`. The dialog now shows a media-type selector (All / Films /
   TV) and a year box.
2. Choose **Films**, type `1985` → the 1985 horror film appears; add it.
3. Repeat with `Arena` / **Films** / `1989`.
4. Search a generic term with **All** and no year → **Load more** appears below the results and
   appends a second page without clearing the query or the filters.
5. Set an impossible combination (e.g. `Arena` + `1600`) → the year is rejected with a clear
   message; set `Arena` + `1955` → the empty state with **Clear filters** appears.
6. Type quickly (`H`, `Ho`, `Hou`, `Hous`, `House`) → only the final query's results are shown.

API-level check for the two reported titles:

```bash
curl -s 'localhost:3000/api/search?q=House&type=movie&year=1985' -b cookies.txt | jq '.results[0]'
curl -s 'localhost:3000/api/search?q=Arena&type=movie&year=1989' -b cookies.txt | jq '.results[0]'
curl -s 'localhost:3000/api/search?q=House&year=abc'             -b cookies.txt   # → 400
```

### US4 — change layout after creation (FR-015 – FR-019)

1. Gear → **Settings** → **Layout** (now a labelled control above the feature toggles), currently
   **List**. Switch to **Grid**, save.
2. The items re-render as a grid immediately, in ranked order, each card carrying its rank badge —
   **not** regrouped into Movies / TV Shows / Watched sections (that grouping remains for unranked
   lists).
3. Reload, and open the list as another member → grid, same order.
4. Switch back to **List** → drag still works and ranks are unchanged.
5. As a non-owner → no Layout control; a direct PATCH with `displayMode` returns `403`.

### Regression check — unranked lists are untouched

Create a list with `rankingEnabled: false` and a mix of movies/TV, some watched. The sort dropdown
is still there, the four grid sections (Movies / TV Shows / Watched → Movies / TV Shows) still
render, there is no drag handle, and a `PATCH .../items/reorder` returns
`400 "This list is not ranked, so items cannot be reordered"`.

## Automated checks

```bash
# Pure logic for the three new lib modules
yarn test -- src/lib/list-item-ordering.test.ts
yarn test -- src/lib/list-validation.test.ts
yarn test -- src/lib/title-search-params.test.ts

# Journeys
yarn test:e2e -- e2e/lists-ranked.spec.ts     # reorder persistence, ranked grid, viewer read-only
yarn test:e2e -- e2e/lists-edit.spec.ts       # rename, description, layout, non-owner refusal

# Completion gate (needs Postgres via DATABASE_URL)
yarn ci:check
```

The E2E specs hit live TMDB (as the existing list specs already do), so `TMDB_API_KEY` must be set
for `lists-edit.spec.ts` and the search assertions.

## Files to touch (from plan.md)

| Concern          | Files                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Pure logic (new) | `src/lib/list-item-ordering.ts`, `src/lib/list-validation.ts`, `src/lib/title-search-params.ts` + tests                      |
| TMDB wrapper     | `src/lib/tmdb.ts` (`searchTv`, `page` on `searchMovie`, `popularity` on `TmdbSearchResult`)                                  |
| Routes           | `src/app/api/lists/route.ts`, `src/app/api/lists/[slug]/route.ts`, `…/items/reorder/route.ts`, `src/app/api/search/route.ts` |
| List rendering   | `src/app/(app)/lists/[slug]/page.tsx`, `list-items-grid.tsx`, `list-items-list-view.tsx`, `list-item-reorder.tsx`            |
| Edit surface     | `src/app/(app)/lists/[slug]/list-settings-panel.tsx`                                                                         |
| Add-title flow   | `src/app/(app)/lists/[slug]/list-add-fab.tsx`                                                                                |
| Docs             | `docs/lists.md`                                                                                                              |

## Deploy

Normal release path: conventional commits (see the commit plan in `plan.md`), `yarn ci:check` green,
merge to `main`, semantic-release cuts the version. No migration to deploy, no env change, no
Docker/cron change — so `README.md` and `.env.example` need no update.
