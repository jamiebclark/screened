# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev              # Start dev server (localhost:3000)
yarn build            # Production build
yarn lint             # ESLint
yarn format           # Prettier auto-format
yarn format:check     # Prettier CI check
yarn test             # Vitest unit tests (once)
yarn test:watch       # Vitest watch mode
yarn test:e2e         # Playwright E2E
yarn test:e2e:ui      # Playwright UI mode
yarn ci:check         # Full local CI (lint + format + migrate + test + build); requires Postgres
yarn db:migrate       # Create + run migration (dev): yarn db:migrate --name <snake_name>
yarn db:migrate:deploy # Deploy migrations (prod / Docker)
yarn db:generate      # Regenerate Prisma client after schema changes
yarn db:studio        # Prisma Studio GUI
```

Run a single Vitest test: `yarn test -- src/lib/foo.test.ts`
Run a single Playwright spec: `yarn test:e2e -- e2e/foo.spec.ts`

Before pushing: run `yarn ci:check` (needs `DATABASE_URL` in `.env` pointing at a reachable Postgres).

## Architecture

**Stack:** Next.js App Router + React Server Components, PostgreSQL + Prisma, NextAuth v5 (JWT), Tailwind v4 + Radix UI, Vitest + Playwright. Self-hosted via Docker Compose.

**Route groups:**
- `src/app/(auth)/` — login, register (public)
- `src/app/(app)/` — all protected routes; auth checked at layout level via `auth()`
- `src/app/api/` — Route Handlers for mutations and integrations

**Data layer:** `src/lib/` holds all business logic — integrations (`plex.ts`, `letterboxd-sync.ts`, `tmdb.ts`), Picker scoring, watch history queries, auth config (`auth.ts`), and the Prisma singleton (`prisma.ts`). Generated Prisma client lives in `src/generated/prisma/` (never edit; regenerate with `yarn db:generate`).

**Shared components:** `src/components/` contains reusable client components (dialogs, rating stars, media cards, nav, notification menu, etc.). App-route-specific components live alongside their route files.

**RSC + client mutations pattern:** Server Components render data server-side. `"use client"` components mutate via `fetch` to `/api/...` Route Handlers, then call `router.refresh()` to re-hydrate Server Components on the same route after a successful mutation. Exceptions: skip `router.refresh()` if the UI is entirely client-state-driven, or if the next step is `router.push()` to another route. See examples in `letterboxd-import-dialog.tsx`, `watch-status-button.tsx`, `invite-member-form.tsx`.

**Auth:** `src/lib/auth.ts` — two providers: email/password (bcrypt) and Plex OAuth. All API routes verify the session with `await auth()` and return 401 before touching data. Cron/admin routes additionally verify `CRON_SECRET` or session role.

**Third-party account linking:** External accounts use dedicated connection models (`PlexConnection`, `LetterboxdConnection`) with a `userId` unique FK. Link/unlink flows live under `/api/<service>/link`. This is the pattern to follow when adding new account connections (e.g. Discord).

**Client-safe enum mirrors:** Prisma-generated enums live in `src/generated/prisma/` and cannot be imported in `"use client"` components. `src/lib/notification-types.ts` re-exports the enums as plain `const` objects + types. Follow this pattern when adding new enums that need client-side use.

**In-app notification system:** `Notification` model stores typed events (see `NotificationType` enum). `src/lib/watch-notifications.ts` creates notifications after manual watch events (not bulk syncs). `GET /api/notifications` serves unread counts and recent items. New notification-triggering events should follow the same pattern: write to `Notification` in the lib layer, not in the route handler.

**Optional features pattern:** Features gated by env vars (`OPENAI_API_KEY`, `OMDB_API_KEY`) check `process.env.*` at call time and degrade gracefully when absent — no crash, no UI exposure. Follow this pattern for any new optional integration: check presence in the lib module, surface capability flags to the UI only when needed.

**Key Prisma models:**
- `UserMediaStatus` — user's tracking status (WATCHLIST/WATCHING/WATCHED/DROPPED) + rating for a title
- `WatchEntry` — individual watch log entries (multiple per status record; source: PLEX/LETTERBOXD/MANUAL)
- `EpisodeStatus` — per-episode TV tracking (season, episode #, watchedAt, review)
- `List` / `ListMember` / `ListItem` — collaborative lists with roles (OWNER/CONTRIBUTOR/VIEWER)
- `PickerRoom` — collaborative "what to watch" session state (JSON)
- `UserPreference` — ATTRACTOR/REPELLER signals for Picker discovery scoring

**Watch history merging:** The `/history` page and title pages merge `WatchEntry` (movies + manual TV) and `EpisodeStatus` rows by date. See `src/lib/watch-history-queries.ts` and `src/lib/watch-entry-merge.ts`.

**External integrations:** Plex sync (`/api/plex/sync`, cron at `/api/cron/plex-sync`), Letterboxd RSS import, TMDB metadata, optional OpenAI embeddings for Picker discovery, optional OMDb rating caching.

## Database (Prisma)

**Migrations only** — never use `prisma db push` on any database that uses `prisma migrate deploy` (local dev Postgres, staging, production, Docker). `db push` skips migration history and causes drift failures.

| Situation | Command |
|-----------|---------|
| Schema change → dev | `yarn db:migrate --name <short_snake_description>` |
| CI / production | `yarn db:migrate:deploy` |

Always commit **both** `prisma/schema.prisma` and the new `prisma/migrations/<timestamp>_*/` folder together. After schema changes, also run `yarn db:generate`.

## Commits

**Conventional Commits are required** — semantic-release drives versioning and changelogs from commit history. `feat` triggers a minor release; `fix` triggers a patch.

**Default to many small commits** — one logical concern per commit. Do not lump unrelated features, refactors, docs, and CI into a single commit unless the user explicitly asks.

A single commit is justified for: one user-facing behavior or bug fix, one repo-wide mechanical change, or one layer of a stack (e.g. schema + migration). Split by scope/area when changes span multiple product areas (`pick`, `lists`, `plex`, `search`, `components`, etc.).

```
<type>(<scope>): <short summary>   # imperative, lowercase, no trailing period, ≤72 chars
```

Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `ci`. Breaking changes: `feat!:` or `BREAKING CHANGE:` footer.

**Order of commits:** land infrastructure first (config, schema, migrations, generated code) before application code that depends on it.

When undoing or splitting commits, prefer `git reset --soft` or mixed reset. Do not use `git reset --hard` unless the user clearly requests it.

## API routes and security

- Use `NextResponse.json` with explicit HTTP status codes. 4xx for client mistakes, 5xx only for unexpected server failures.
- Authenticate before reading or mutating user-owned data; return 401 when no session.
- Validate request bodies and query params; return 400 with a clear `error` message on invalid input.
- Never expose raw exception messages or stack traces in JSON responses; log server-side and return a generic 500 message.
- Secrets (`process.env`, `DATABASE_URL`, `AUTH_SECRET`, API keys, tokens) are server-only — never in `NEXT_PUBLIC_` env vars.
- Use Prisma's parameterized API only; no string-concatenated SQL.

## Testing

- **Vitest:** add/update tests for non-trivial or regression-prone pure logic in `src/lib/` (parsers, validators, helpers).
- **Playwright:** extend specs for critical user journeys when behavior changes (auth, pick, lists, watch status); reuse helpers under `e2e/`.
- When an API contract changes (status code or JSON shape), update callers and any tests asserting the response.
- Run `yarn ci:check` before claiming work complete (when Postgres is available). Run `yarn lint` on touched files and fix new issues.

## UI/UX standards

Follow `docs/ui-ux-standards.md` for any visible changes. Key rules:

- **Content hierarchy:** hero/identity → primary actions → peer sections. Don't wrap unrelated sections in one bordered card.
- **Section headings:** `h3` with `text-base font-semibold`. Optional count in `text-sm font-normal text-muted-foreground`. Be consistent — don't mix uppercase+tracking labels with sentence-case `h3` on the same page.
- **Loading:** route-level `loading.tsx` or section-level skeletons that mirror final layout.
- **Empty:** short human copy, one primary action when appropriate. Same typography as section body text.
- **Error:** user-safe message + optional retry. No stack traces. Reuse existing `Alert` / toast patterns.

## Documentation to keep in sync

When adding features, env vars, or changing Docker/cron behavior, update `README.md` and `.env.example`. `CHANGELOG.md` is managed by semantic-release — do not edit manually.

## Authoritative rule sources

These `.cursor/rules/` files contain full detail behind the summaries above — read them when a situation isn't covered here:

- `prisma-migrations.mdc` — complete Prisma migration strategy and agent checklist
- `conventional-commits.mdc` — commit splitting rules, ordering, and edge cases
- `next-rsc-router-refresh.mdc` — full RSC/router.refresh() decision tree with examples
- `engineering-standards.mdc` — API route patterns, security, and testing expectations

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
