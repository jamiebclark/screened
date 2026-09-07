# End-to-end tests

Playwright specs live in `e2e/`. They run against a real server and a real
database, and they run in CI as the **E2E (Playwright)** job.

## Running them

```bash
yarn build          # the suite serves the production build
yarn test:e2e       # all specs
yarn test:e2e -- e2e/lists.spec.ts          # one spec
yarn test:e2e -- --grep "sticky header"     # one test
```

Playwright starts the server itself on port **3010** and stops it afterwards.
It reuses a server already listening there, so you can keep one running between
runs. Change the port with `PLAYWRIGHT_PORT`, or point the suite at a server you
manage with `PLAYWRIGHT_BASE_URL`.

## Why it serves a production build

`next dev` compiles a route the first time it is requested, which regularly
takes longer than the short `waitForURL` timeouts these specs use. The same
`auth.spec.ts` scores 7/9 in 1.8 minutes against `next dev` and 9/9 in 22
seconds against `next start`. So the default is `next start`, which is also what
CI and production run.

If you would rather skip the build and accept the flake:

```bash
E2E_DEV_SERVER=1 yarn test:e2e
```

## The port has to match the auth URL

NextAuth resolves its callback URL from `AUTH_URL` / `NEXTAUTH_URL`. If those
point at a different origin than the port under test, sign-in redirects
somewhere the test is not watching and **every spec fails at login** — which is
what happened while the config defaulted to port 3000 and `yarn dev` served 3003. `playwright.config.ts` now sets `AUTH_URL`, `NEXTAUTH_URL`,
`AUTH_TRUST_HOST` and `NEXT_PUBLIC_APP_URL` on the server it starts, all derived
from the port it is about to use. Keep them in step if you change the port.

## TMDB

`e2e/global-setup.ts` seeds the `MediaItem` rows the specs reference before the
run. `getOrCreateMediaItem` and `getOrCreateTvItem` both read the database
before calling TMDB, so adding a title in a spec never needs a live key — which
is why CI can run the suite with a placeholder `TMDB_API_KEY`.

Add the row to `global-setup.ts` when a spec starts using a new TMDB id, and
keep the seeded titles in step with what the specs assert.

Seeding does **not** cover surfaces that call TMDB on every request:

- `/api/search`
- the browse and upcoming pages
- the TV season list on `/tv/[tmdbId]`, which supplies episode names

Specs covering those call `test.skip(!LIVE_TMDB, LIVE_TMDB_REASON)` and are
skipped unless you opt in:

```bash
E2E_LIVE_TMDB=1 yarn test:e2e     # needs a real TMDB_API_KEY in .env
```

They are skipped rather than deleted so they still run for anyone with a key,
and skipped rather than left failing so the CI job means something.

## What CI runs, and what it does not

The **E2E (Playwright)** job runs a named list of specs, not the whole suite:

```
auth  app-pages  watchlist  stats  browse  browse-filter  search  upcoming  episodes
```

That is 43 passing and 32 skipped in about 4 minutes against a fresh database.

The rest of the suite is excluded because it was already failing before the job
existed. A full run is **93 failed / 56 passed / 32 skipped and takes 1.2
hours**, so including it would make the gate permanently red. The excluded
specs are:

`lists` · `lists-advanced` · `lists-challenge` · `lists-curation` ·
`lists-edit` · `lists-poll` · `lists-ranked` · `watch-status` ·
`watch-history` · `ratings` · `profile` · `plex` · `friends-hub` ·
`friends-privacy` · `pick-session-activity` · `screenshot-demo`

Three causes, from triaging them:

1. **Surfaces that call TMDB on every request.** `/movies/[tmdbId]` and
   `/tv/[tmdbId]` call `getMovie`/`getTvShow` directly and ignore the database,
   and the home page calls `getTrending`. Seeded rows cannot help, and ten spec
   files navigate to a detail page. These need a real key, like the specs
   already marked with `LIVE_TMDB`.
2. **Cross-spec interference.** `lists.spec.ts` scores 0/9 in a full run and
   3/9 alone; specs share a database and a user, and several assert on state a
   different spec has changed.
3. **Stale expectations.** Assertions written against UI that has since moved
   on — for example a `/clear/i` locator that now matches both "Clear" and
   "Clear filters", which is a strict-mode failure rather than a real defect.

Repairing these is worth doing, but it is its own piece of work. Move a spec
into the CI list once it passes twice in a row against a fresh database.

**Known flake:** the two `stats.spec.ts` tests trade a shared user's watch
history and can fail on first attempt, passing on retry. CI retries twice, so
they surface as `flaky` rather than red.

## Test isolation

Specs share a database and mostly create their own fixtures, but a few assert
empty states. Those pass against a fresh database and can fail against a
long-lived dev database that has accumulated lists and watch history. CI creates
a database per run. To reproduce CI locally:

```bash
createdb screened_e2e_local
DATABASE_URL=postgresql://…/screened_e2e_local yarn prisma migrate deploy
DATABASE_URL=postgresql://…/screened_e2e_local yarn test:e2e
```

## On failure

Playwright writes a screenshot, a video and a trace for the first retry into
`test-results/`. The CI job uploads that directory as the `playwright-report`
artifact, kept for 7 days.
