# Agent instructions (Cursor / automation)

## Documentation map

- **User-facing / setup:** `README.md` and `.env.example` (keep aligned when adding features, env vars, or Docker/cron behavior).
- **Changelog / releases:** `CHANGELOG.md` (semantic-release).
- **This file:** Prisma, commits, and RSC — not a substitute for the README feature list.

## Database and Prisma

**Source of truth:** `.cursor/rules/prisma-migrations.mdc` (always applied in Cursor).

Summary: **migrations only** for persisted environments. Do **not** use `prisma db push` on databases that use `prisma migrate deploy`. After schema edits, create and commit a migration (`yarn prisma migrate dev --name ...` or equivalent).

**CI:** `.github/workflows/ci.yml` runs `prisma migrate deploy`, `prisma migrate diff` (migrations vs `schema.prisma`), `prisma generate`, and `yarn build` on every PR and push to `main`. Apply migrations on real hosts with `yarn db:migrate:deploy` (same as Docker `CMD`).

**Before push:** run **`yarn ci:check`** locally (needs Postgres reachable via `DATABASE_URL` in `.env`; creates a shadow DB named `prisma_shadow_ci` on the same server if missing). This should match the GitHub Actions job.

## Commits

**Source of truth:** `.cursor/rules/conventional-commits.mdc` (always applied in Cursor).

- Use **Conventional Commits** (required for semantic-release).
- Use **small, logically grouped commits**—one concern per commit when practical; do not lump unrelated features, docs, CI, and tests into a single commit unless the user explicitly asks. When undoing or splitting commits, avoid destructive git commands that drop work unless the user clearly requests them.

## Next.js App Router (RSC + client mutations)

**Source of truth:** `.cursor/rules/next-rsc-router-refresh.mdc` (always applied in Cursor).

Summary: when a `"use client"` component mutates data via `fetch` to `/api/...` and a **Server Component on the same route** still renders that data, call **`router.refresh()`** after a successful response unless the UI is fully updated via local state or you navigate away.

