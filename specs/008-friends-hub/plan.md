# Implementation Plan: First-Class Friends Hub

**Branch**: `008-friends-hub` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-friends-hub/spec.md`

## Summary

Promote the existing friends functionality from Settings into a dedicated `/friends` route accessible in one click from the main nav, adding per-friend recent-activity snapshots and inline friend-request management. All underlying API routes and data models already exist; this is primarily a UI restructuring and new-page build.

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20, Next.js 15 App Router  
**Primary Dependencies**: Next.js 15, Prisma 5 (PostgreSQL), NextAuth v5, Tailwind v4, Radix UI, Lucide icons  
**Storage**: PostgreSQL — no schema changes needed  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Web (self-hosted via Docker Compose)  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: Standard page load; TMDB title lookups are server-side and Next.js fetch-cached  
**Constraints**: Must not break existing friends flow; `/settings/friends` must redirect gracefully  
**Scale/Scope**: Small-to-medium user base; friends list per user unlikely to exceed 50–100 entries

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](.specify/memory/constitution.md) (v1.0.0):

- [x] **I. Server Components First** — `/friends` page is an RSC; interactive panels (`FriendRequestsPanel`, `FindFriendsPanel`) are `"use client"` components that mutate via fetch + `router.refresh()`
- [x] **II. Security by Default** — page uses `auth()` at layout level (protected `(app)` group); all existing API routes already auth-check; no new routes needed
- [x] **III. Migrations Only** — no schema changes; Prisma models already exist
- [x] **IV. Conventional Commits** — commit plan: nav/redirect first, then lib, then page, then tests; each layer is a separate commit
- [x] **V. Test at the Right Level** — Playwright E2E for friend list, request management, find-friends flow; no new pure lib logic needs Vitest

## Project Structure

### Documentation (this feature)

```text
specs/008-friends-hub/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── friends-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (app)/
│       ├── friends/
│       │   ├── page.tsx              # NEW: RSC – friends hub
│       │   └── loading.tsx           # NEW: skeleton
│       └── settings/
│           └── friends/
│               └── page.tsx          # CHANGED: redirect to /friends
├── components/
│   ├── nav.tsx                        # CHANGED: add Friends nav link
│   ├── friend-requests-panel.tsx      # NEW: "use client" – accept/decline/cancel
│   └── find-friends-panel.tsx         # NEW: "use client" – search + add
├── lib/
│   └── friends-queries.ts             # NEW: getRecentActivityPerFriend()
└── app/(app)/settings/
    └── settings-nav.tsx               # CHANGED: remove Friends entry

e2e/
└── friends-hub.spec.ts                # NEW: Playwright E2E
```

**Structure Decision**: Single Next.js App Router project. New route under `(app)/friends/` (auth-protected by layout). Interactive concerns extracted into purpose-built `"use client"` components so the page shell stays server-rendered.

## Complexity Tracking

> No Constitution violations — section not applicable.
