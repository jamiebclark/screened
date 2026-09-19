# Implementation Plan: Public List Visibility

**Branch**: `012-public-list-visibility` | **Date**: 2026-09-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-public-list-visibility/spec.md`

## Summary

Replace the two-state `List.isPublic` flag with a three-tier `ListVisibility` enum (`PUBLIC` / `MEMBERS` / `PRIVATE`), migrate existing lists so nothing becomes internet-visible by accident, move the list detail route out of the auth-guarded `(app)` group into `(public)`, and render an anonymous-safe read-only view for `PUBLIC` lists whose data shape (not just its UI) omits members, voter identities, per-viewer state, secrets, and every mutation control. A single pure helper (`resolveListAccess`) drives the page, `generateMetadata`, `GET /api/lists/[slug]`, and the Radarr feed so all surfaces enforce the same matrix. Ships as a `feat` to `main`, which semantic-release turns into a minor version and a Docker image.

## Technical Context

**Language/Version**: TypeScript 5 / Node 22
**Primary Dependencies**: Next.js App Router (RSC), NextAuth v5 (JWT, `auth()` in RSC + edge proxy), Prisma, Tailwind v4 + Radix UI, lucide-react
**Storage**: PostgreSQL via Prisma migrations (`prisma/migrations/`)
**Testing**: Vitest (`src/lib/*.test.ts`), Playwright (`e2e/*.spec.ts`, helpers in `e2e/helpers.ts`)
**Target Platform**: Self-hosted Docker Compose (Linux), image built by `.github/workflows/release.yml`
**Project Type**: Web application (single Next.js project; RSC pages + `/api` route handlers)
**Performance Goals**: Anonymous list page renders in one server round-trip with no extra queries beyond today's signed-in path (it skips the member-status and comment-read queries, so it is strictly cheaper)
**Constraints**: No `db push`; anonymous payload MUST NOT contain the FR-008 fields (RSC props are visible in HTML); every visible change works at ~390px and desktop; existing shared list URLs and Radarr/Discord URLs keep working
**Scale/Scope**: ~15 source files reference `isPublic`; 7 e2e specs + `scripts/seed-demo.ts` construct lists with `isPublic`; one route subtree moves groups; one new lib module + test; one new e2e spec

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify against the [Screened Constitution](.specify/memory/constitution.md) (v1.1.0):

- [x] **I. Server Components First** — list page stays an RSC; the anonymous view model is built server-side. Visibility changes go through the existing `PATCH /api/lists/[slug]` + `router.refresh()` in `list-settings-panel.tsx`. New `AnonymousListPrompt` is a server-renderable link component (no client state). The `isAnonymous` flag is a plain prop into existing client components.
- [x] **II. Security by Default** — `GET /api/lists/[slug]` and the Radarr feed call `resolveListAccess` and return 401/403 per the contract; `POST`/`PATCH` validate `visibility` with `parseListVisibility` → 400. No new env vars. `radarrToken` and Discord fields are stripped from the anonymous API response. The edge proxy exemption is limited to `GET` on the single list resource and the exact list page path.
- [x] **III. Migrations Only** — `prisma migrate dev --create-only` scaffold, hand-edited to add the backfill `UPDATE`, applied with `yarn db:migrate`; `schema.prisma` + migration folder land in one commit; `yarn db:generate` run and generated client committed.
- [x] **IV. Conventional Commits** — commit sequence below is ordered infrastructure → lib → routes → UI → tests → docs, one concern each; `feat(lists)` commits trigger the minor release.
- [x] **V. Test at the Right Level** — Vitest for `resolveListAccess` / `parseListVisibility` (pure lib logic); Playwright `lists-public.spec.ts` for the anonymous journeys and API matrix; existing list specs updated for the API contract change; `yarn ci:check` before merge.

**UI/UX standards check**: The visibility selector is a 3-item radio group (spacious card pattern, matches today's 2-item version). The anonymous list page reuses the existing grid/list density decisions — no new collection is introduced. The sign-in prompt sits in the header's primary-action slot per the hierarchy rule (identity → primary actions). Section headings unchanged.

**Post-design re-check**: No violations. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/012-public-list-visibility/
├── plan.md              # This file
├── research.md          # Phase 0 — 12 decisions (R1–R12)
├── data-model.md        # Phase 1 — enum, migration SQL, access matrix, view-model deltas
├── quickstart.md        # Phase 1 — local verification + deploy steps
├── contracts/
│   ├── list-visibility-api.md      # POST/PATCH/GET /api/lists[/slug], Radarr feed
│   └── list-page-anonymous.md      # /lists/[slug] by tier × viewer; selector; badges
├── checklists/requirements.md
└── tasks.md             # Phase 2 — /speckit.tasks (not created here)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                  # + enum ListVisibility; List.isPublic → visibility
└── migrations/<ts>_add_list_visibility_tier/      # hand-edited with backfill UPDATE

src/generated/prisma/                              # regenerated (yarn db:generate)

src/lib/
├── list-visibility.ts                             # NEW: const mirror, options, parse, resolveListAccess
├── list-visibility.test.ts                        # NEW: Vitest matrix
└── app-shell.ts                                   # NEW: shared signed-in shell loader (user check, onboarding, unread count)

src/proxy.ts                                       # allow anon: ^/lists/(?!new$)[^/]+$ ; GET ^/api/lists/[^/]+$

src/app/(app)/
├── layout.tsx                                     # uses app-shell helper
└── lists/
    ├── page.tsx                                   # discovery: visibility in [PUBLIC, MEMBERS]; badge via ListCard
    └── new/page.tsx                               # 3-option selector, default MEMBERS, posts `visibility`

src/app/(public)/
├── layout.tsx                                     # uses app-shell helper when session exists
└── lists/[slug]/                                  # MOVED from (app)/lists/[slug] (git mv, whole subtree)
    ├── page.tsx                                   # resolveListAccess; anonymous view model; isAnonymous props
    ├── loading.tsx
    ├── history/page.tsx                           # generateMetadata guarded
    ├── anonymous-list-prompt.tsx                  # NEW: sign-in CTA (header slot + modal)
    ├── list-page-header.tsx                       # visibility badge; anonymous branch (no members/actions)
    ├── list-items-grid.tsx                        # GridItem: addedBy nullable, voteSummary; isAnonymous
    ├── list-items-list-view.tsx                   # voteSummary; hide addedBy when null
    ├── list-item-reorder.tsx                      # thread isAnonymous
    ├── list-item-modal.tsx                        # voteSummary; anon: prompt instead of comments; no addedBy/watchedBy
    ├── list-settings-modal.tsx                    # visibility prop
    ├── list-settings-panel.tsx                    # 3-option selector; PATCH `visibility`
    └── private-list-gate.tsx                      # unchanged

src/app/api/lists/
├── route.ts                                       # POST accepts `visibility`; GET discovery filter
└── [slug]/
    ├── route.ts                                   # GET: resolveListAccess → 401/403; anon-safe shape. PATCH: `visibility`
    └── radarr/route.ts                            # PUBLIC only is token-less

src/components/
├── list-card.tsx                                  # 3-tier badge
└── title-lists-section.tsx                        # discovery filter; badge

scripts/seed-demo.ts                               # visibility: "MEMBERS"

e2e/
├── lists-public.spec.ts                           # NEW: anonymous journeys + API matrix
├── lists*.spec.ts, search.spec.ts                 # isPublic → visibility in request bodies; selector labels
└── helpers.ts                                     # (if a createList helper exists, switch its field)

README.md                                          # lists feature bullet mentions the three tiers
```

**Structure Decision**: Single Next.js project. The only structural change is moving `lists/[slug]` from the `(app)` route group to `(public)` (R3); route groups let `/lists` and `/lists/new` remain auth-gated while `/lists/:slug` is served without a session. All other work is in-place edits.

## Phase outputs

- **Phase 0** → `research.md` (R1–R12). No NEEDS CLARIFICATION remained.
- **Phase 1** → `data-model.md`, `contracts/list-visibility-api.md`, `contracts/list-page-anonymous.md`, `quickstart.md`; `CLAUDE.md` plan pointer updated to this file.

## Commit plan (for /speckit.tasks ordering)

1. `feat(db): add three-tier list visibility enum and migrate isPublic` — schema, migration (with backfill), generated client
2. `feat(lists): add list-visibility helpers and access resolver` — `src/lib/list-visibility.ts` + test
3. `refactor(app): share signed-in shell loading between app and public layouts` — `src/lib/app-shell.ts`, both layouts
4. `feat(lists): enforce visibility tiers in list API and radarr feed` — `route.ts` (GET/PATCH/POST), radarr, discovery filters
5. `feat(lists): serve list pages without a session` — `git mv` to `(public)`, proxy exemptions, page access resolution + metadata guard
6. `feat(lists): render an anonymous read-only view for public lists` — view-model changes (`voteSummary`, nullable `addedBy`), `isAnonymous` threading, prompt component, header/modal branches
7. `feat(lists): choose between public, site-members and private visibility` — new-list form, settings panel/modal, badges on card/header/title section
8. `test(lists): cover anonymous access to public lists` — new e2e spec, updated existing specs, seed script
9. `docs(readme): describe list visibility tiers`

## Complexity Tracking

No constitution violations to justify.
