# Quickstart: List Watch Timeline

**Feature**: 013-list-watch-timeline

## Prerequisites

- `.env` with `DATABASE_URL` pointing at a reachable local Postgres
- `yarn install`

No schema change — nothing to migrate.

## Run it

```bash
yarn dev
```

1. Sign in, create a list (Site members), add two or three films.
2. Mark one as watched (title page → status → Watched). Open the list and click the **Timeline** icon (next to Challenge history).
   - Expected: `/lists/<slug>/timeline` shows the film once on a vertical axis with today's date, your avatar + name on the entry, and the other films under **Not watched yet (N)**.
3. In list settings set a challenge window entirely in the past (e.g. 2020-01-01 → 2020-01-31) and reload.
   - Expected: "Nothing watched in this window yet." with the window description; the axis heading shows the range.
4. Widen the window to start today and clear the end; reload.
   - Expected: the film is back, the axis starts on today's date with a **Today** marker.
5. Change visibility to **Public**, open the timeline URL in a private/incognito window.
   - Expected: same titles and dates, but "Watched once" instead of your name/avatar; your name appears nowhere in the page source.
6. Change visibility to **Site members** and refresh the incognito tab.
   - Expected: redirect to `/login?callbackUrl=%2Flists%2F<slug>%2Ftimeline`.

## Tests

```bash
yarn test -- src/lib/list-watch-timeline.test.ts   # builder, anchoring, markers, anonymisation
yarn test:e2e -- e2e/lists-timeline.spec.ts        # member view, window, public/anonymous, redirects
yarn ci:check                                      # full gate before pushing
```

## Responsive check

Follow `docs/ui-ux-standards.md` → "Responsive layout": screenshot the timeline at ~390px and desktop. The rail stays fixed-width, entry rows shrink (`min-w-0 flex-1`), watcher clusters wrap, and the page must not scroll horizontally.

## Deploy

1. `yarn ci:check` green on `013-list-watch-timeline`.
2. `git checkout main && git merge --ff-only 013-list-watch-timeline && git push origin main`.
3. `gh run watch` — the Release workflow runs semantic-release (the `feat` commits cut a minor version) and pushes `jamiebclark/screened:<version>` + `:latest` to Docker Hub.
4. On the host: `docker compose pull && docker compose up -d`.
