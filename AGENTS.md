# Agent instructions (Cursor / automation)

## Database and Prisma

**Source of truth:** `.cursor/rules/prisma-migrations.mdc` (always applied in Cursor).

Summary: **migrations only** for persisted environments. Do **not** use `prisma db push` on databases that use `prisma migrate deploy`. After schema edits, create and commit a migration (`yarn prisma migrate dev --name ...` or equivalent).

**CI:** `.github/workflows/ci.yml` runs `prisma migrate deploy`, `prisma migrate diff` (migrations vs `schema.prisma`), `prisma generate`, and `yarn build` on every PR and push to `main`. Apply migrations on real hosts with `yarn db:migrate:deploy` (same as Docker `CMD`).

## Commits

Follow **Conventional Commits** — see `.cursor/rules/conventional-commits.mdc`.

## Next.js App Router (RSC + client mutations)

**Source of truth:** `.cursor/rules/next-rsc-router-refresh.mdc` (always applied in Cursor).

Summary: when a `"use client"` component mutates data via `fetch` to `/api/...` and a **Server Component on the same route** still renders that data, call **`router.refresh()`** after a successful response unless the UI is fully updated via local state or you navigate away.

