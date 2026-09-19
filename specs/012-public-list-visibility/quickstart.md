# Quickstart: Public List Visibility

**Feature**: 012-public-list-visibility

## Prerequisites

- `.env` with `DATABASE_URL` pointing at a reachable local Postgres
- `yarn install`

## Apply the schema change

```bash
yarn db:migrate --name add_list_visibility_tier   # creates + applies migration
yarn db:generate                                  # regenerate Prisma client + barrel
```

The migration backfills every existing `isPublic=false` list to `PRIVATE` and every other list to `MEMBERS`. No list becomes `PUBLIC`.

## Run it

```bash
yarn dev
```

1. Sign in, create a list, choose **Public** in the visibility selector.
2. Copy the list URL and open it in a private/incognito window.
   - Expected: the list renders (name, description, items, ranks, tags, vote totals, comment counts) with the public nav and a "Sign in to vote and comment" prompt. No member avatars, no added-by avatars, no add/settings/hide/reorder controls.
3. Change the list to **Site members** and refresh the incognito tab.
   - Expected: redirect to `/login?callbackUrl=%2Flists%2F<slug>`.
4. Change it to **Private** — same redirect for anonymous; signed-in non-members see the request-access gate.

## Verify the API matrix

```bash
SLUG=<slug>
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/lists/$SLUG          # PUBLIC→200, MEMBERS→401, PRIVATE→401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/lists/$SLUG/radarr   # PUBLIC→200, others→401
```

## Tests

```bash
yarn test -- src/lib/list-visibility.test.ts     # access matrix + parser
yarn test:e2e -- e2e/lists-public.spec.ts        # anonymous journeys
yarn ci:check                                    # full gate before pushing
```

## Responsive check

Follow `docs/ui-ux-standards.md` → "Responsive layout": screenshot the anonymous list page at ~390px and desktop; the sign-in prompt must stack under the title on phones and the page must not scroll horizontally.

## Deploy

1. `yarn ci:check` green on `012-public-list-visibility`.
2. `git checkout main && git merge --ff-only 012-public-list-visibility && git push origin main`.
3. `gh run watch` — the Release workflow runs semantic-release (the `feat` commits cut a minor version) and pushes `jamiebclark/screened:<version>` + `:latest` to Docker Hub.
4. On the host: `docker compose pull && docker compose up -d`. The container runs `yarn db:migrate:deploy` on start, which applies `add_list_visibility_tier`.
