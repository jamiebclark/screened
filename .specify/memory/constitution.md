<!--
SYNC IMPACT REPORT
==================
Version change: [unversioned template] → 1.0.0
New principles:
  - I. Server Components First
  - II. Security by Default
  - III. Migrations Only (NON-NEGOTIABLE)
  - IV. Conventional Commits, Ordered and Small
  - V. Test at the Right Level
New sections: Integration Standards, UI/UX Standards, Governance
Templates reviewed:
  - .specify/templates/plan-template.md ✅ Constitution Check section aligns with these principles
  - .specify/templates/spec-template.md ✅ No changes required
  - .specify/templates/tasks-template.md ✅ No changes required
Deferred items: None
-->

# Screened Constitution

## Core Principles

### I. Server Components First

All data rendering MUST use React Server Components (RSC). The `"use client"` directive is reserved
exclusively for interactive UI that requires browser state or event handlers. Mutations MUST go
through `fetch` to `/api/...` Route Handlers; after a successful mutation, call `router.refresh()`
to re-hydrate the page. Skip `router.refresh()` only when UI is entirely client-state-driven or
the next step is `router.push()` to another route.

**Rationale**: RSC eliminates unnecessary client-side data-fetching, reduces bundle size, and keeps
secrets server-side. The pattern is established in `letterboxd-import-dialog.tsx`,
`watch-status-button.tsx`, and `invite-member-form.tsx`.

### II. Security by Default

Every API route MUST call `await auth()` before reading or mutating user-owned data and return 401
when no session is present. All request bodies and query parameters MUST be validated; return 400
with a clear `error` message on invalid input. Raw exception messages and stack traces MUST NOT
appear in JSON responses — log server-side and return a generic 500 message. Secrets
(`AUTH_SECRET`, `DATABASE_URL`, API keys) MUST remain server-only and MUST NOT appear in
`NEXT_PUBLIC_` env vars. Use Prisma's parameterized API only — no string-concatenated SQL.

**Rationale**: Auth and validation failures are the most common source of data exposure. This
principle ensures every route is secure by construction, not by coincidence.

### III. Migrations Only (NON-NEGOTIABLE)

Schema changes MUST use `yarn db:migrate --name <description>` on dev and
`yarn db:migrate:deploy` on production/CI. `prisma db push` is PROHIBITED on any database that
uses `prisma migrate deploy`. The schema file and its migration folder MUST be committed together.
After every schema change, regenerate the Prisma client with `yarn db:generate`.

**Rationale**: `db push` bypasses migration history and causes drift failures that are difficult to
recover from in production and Docker environments. Prior incidents with mock/push divergence
motivate this as non-negotiable.

### IV. Conventional Commits, Ordered and Small

All commits MUST follow Conventional Commits: `feat`, `fix`, `refactor`, `chore`, `test`, `perf`,
`ci`, `docs`. `feat` triggers a minor release; `fix` triggers a patch. The default MUST be many
small commits — one logical concern per commit. Infrastructure (config, schema, migrations,
generated code) MUST land in earlier commits before application code that depends on it. Ask about
commit grouping before committing when scope is ambiguous.

**Rationale**: Semantic-release derives versions and changelogs from commit history. Small, ordered
commits enable bisection, cherry-picks, and precise rollbacks.

### V. Test at the Right Level

Vitest unit tests MUST cover non-trivial or regression-prone pure logic in `src/lib/` (parsers,
validators, helpers). Playwright E2E tests MUST cover critical user journeys when behavior changes
(auth, pick, lists, watch status). `yarn ci:check` MUST pass before claiming work complete. When
an API contract changes (status code or JSON shape), callers and tests asserting the response
MUST be updated simultaneously.

**Rationale**: Testing at the wrong level produces false confidence. This principle matches test
type to the risk profile of each layer — unit for pure logic, E2E for user-visible flows.

## Integration Standards

External account connections (Plex, Letterboxd, Discord) MUST use dedicated connection models
(e.g., `PlexConnection`) with a `userId` unique FK. Link/unlink flows MUST live under
`/api/<service>/link`. External API responses MUST normalize potentially-missing array fields to
`[]` at the fetch boundary — never at individual callsites. Optional features gated by env vars
(e.g., `OPENAI_API_KEY`, `OMDB_API_KEY`) MUST check `process.env.*` at call time and degrade
gracefully when absent — no crash, no UI exposure. Prisma-generated enums needed in `"use client"`
components MUST be re-exported as plain `const` objects + types in a lib module (e.g.,
`src/lib/notification-types.ts`).

## UI/UX Standards

Content hierarchy on every page MUST follow: hero/identity → primary actions → peer sections. Do
not wrap unrelated sections in one bordered card. Section headings MUST use `h3` with
`text-base font-semibold`; do not mix uppercase-tracking labels with sentence-case `h3` on the
same page. Loading states MUST use route-level `loading.tsx` or section-level skeletons that mirror
final layout. Error states MUST show a user-safe message (no stack traces) and optionally a retry
action using existing `Alert`/toast patterns. Full guidance is in `docs/ui-ux-standards.md`.

## Governance

This constitution supersedes all other practices when there is a conflict. Amendments require:
(1) a version increment per semantic versioning rules — MAJOR for principle removals or
redefinitions, MINOR for additions or material expansions, PATCH for clarifications and wording;
(2) documented rationale; (3) a migration plan if existing code must change. All PRs MUST pass the
`yarn ci:check` gate. Reviewers MUST verify compliance with these principles. The
`.cursor/rules/` directory contains authoritative detail behind the summaries above — read them
when a situation is not covered here.

**Version**: 1.0.0 | **Ratified**: 2026-05-05 | **Last Amended**: 2026-05-05
