# Research: Public List Visibility

**Feature**: 012-public-list-visibility · **Date**: 2026-09-19

All Technical Context items were resolvable from the existing codebase; no external research was required. Each decision below records what was found in the repo and what was chosen.

## R1. Representing the three tiers

**Decision**: Replace `List.isPublic Boolean @default(true)` with `List.visibility ListVisibility @default(MEMBERS)` where `enum ListVisibility { PUBLIC MEMBERS PRIVATE }`. Drop `isPublic` in the same migration.

**Rationale**: A Prisma enum is the existing pattern for closed sets (`WatchStatus`, `DisplayMode`, `ListRole`). Keeping both fields would create two sources of truth and drift. `isPublic` is referenced in ~15 source files, all of which need to change anyway to render three states, so removing it is not extra work.

**Alternatives considered**:

- Add `allowAnonymous Boolean` beside `isPublic` — two booleans produce a nonsensical `{isPublic:false, allowAnonymous:true}` state and complicate every query.
- Reinterpret `isPublic=true` as anonymous-visible — rejected by the owner during scoping (silently widens exposure of existing lists).

## R2. Data migration

**Decision**: Hand-author the migration SQL: create the enum, add `visibility` with default `MEMBERS`, `UPDATE "List" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false`, then drop `isPublic`. Generate the scaffold with `prisma migrate dev --create-only --name add_list_visibility_tier`, edit it to insert the `UPDATE`, then apply with `prisma migrate dev`.

**Rationale**: Prisma's auto-generated migration would add the column (all rows → `MEMBERS`) and drop `isPublic` without a backfill, silently turning private lists into site-member lists. The constitution mandates migrations only; `--create-only` is the supported way to customise a migration before applying it. FR-004 / SC-002 are satisfied because no row is ever written as `PUBLIC` by the migration.

**Alternatives considered**: Two migrations (add column + backfill, then drop) — more history churn for no benefit; a single transactional migration is safe in Postgres.

## R3. Serving `/lists/[slug]` without a session

**Decision**: Move `src/app/(app)/lists/[slug]/` (page, loading, history, all co-located components) to `src/app/(public)/lists/[slug]/` with `git mv`. `/lists` (index) and `/lists/new` stay in `(app)`. The page itself enforces the tier via a lib helper and redirects/gates as needed.

**Rationale**: `(app)/layout.tsx` unconditionally redirects unauthenticated requests to `/login`, so any anonymous route must live outside it. Next.js route groups may split a subtree: `(app)/lists/page.tsx` → `/lists`, `(public)/lists/[slug]/page.tsx` → `/lists/:slug`, no conflict. `/releases` already uses `(public)`, so the layout, nav (renders "Sign in" when `user` is null), and footer exist. The history sub-page already performs its own `auth()` + membership check (`history/page.tsx:150-161`), so moving it is safe.

**Alternatives considered**:

- Path-sniffing in `(app)/layout.tsx` to skip the redirect for `/lists/*` — fragile, mixes routing concerns into the layout.
- A parallel `(public)/l/[slug]` route — two URLs for one list; breaks shared links and the Radarr/Discord URLs already handed out.

## R4. `(public)` layout parity for signed-in users

**Decision**: Extract the signed-in shell logic from `(app)/layout.tsx` (user existence check → sign-out redirect, onboarding redirect, unread-notification count) into `src/lib/app-shell.ts` and reuse it from `(public)/layout.tsx` when a session exists. Anonymous requests skip it.

**Rationale**: Today `(public)/layout.tsx` hard-codes `initialUnreadNotifications={0}` and skips onboarding enforcement. Once a heavily-used page (list detail) lives under `(public)`, signed-in users would lose their notification badge and could bypass onboarding there. Sharing the helper keeps both layouts identical for signed-in users.

**Alternatives considered**: Duplicate the queries in the public layout — violates DRY; leave as-is — regresses UX for every signed-in list viewer.

## R5. Edge middleware (`src/proxy.ts`)

**Decision**: Add two allow-through rules: page path matching `^/lists/(?!new$)[^/]+$`, and `GET` requests matching `^/api/lists/[^/]+$`. Everything else keeps today's behaviour. The page and the route handler make the actual tier decision.

**Rationale**: The proxy currently redirects every unauthenticated request (including API calls) to `/login`. The Radarr endpoint is already exempted the same way (`isRadarrEndpoint`). Exempting only the exact list page and only `GET` on the list resource keeps `/lists`, `/lists/new`, `/lists/[slug]/history`, and all mutating list routes behind the login redirect. The `(?!new$)` guard is belt-and-braces — `(app)/layout.tsx` would redirect anyway.

**Alternatives considered**: Exempt `/lists/**` wholesale — would leak the login redirect behaviour for sub-routes and rely solely on page-level checks.

## R6. Access decision helper

**Decision**: New `src/lib/list-visibility.ts` exporting a client-safe const mirror (`ListVisibility`), option metadata (label, description, icon name), an input parser (`parseListVisibility`), and a pure `resolveListAccess({ visibility, hasSession, isMember }) → "granted" | "login" | "forbidden"`. Unit-tested with Vitest.

**Rationale**: Matches the `notification-types.ts` pattern for enums used in `"use client"` components. Centralising the decision means the page, `GET /api/lists/[slug]`, `generateMetadata`, and the Radarr feed all agree (FR-010, SC-003).

## R7. Anonymous-safe view model

**Decision**: Build the anonymous shape on the server, not by hiding elements on the client:

- `GridItem.addedBy` becomes nullable; anonymous → `null`.
- `GridItem.votes` (which carries voter `userId`s) is replaced by a server-computed `voteSummary: { up, down, userVote }`. This also removes three duplicated `filter`/`find` computations in grid, list-view, and modal.
- `watchedBy` / `watchingBy` → `[]`; the member-status query is skipped entirely for anonymous viewers.
- Header receives `memberAvatars=[]`, `memberCount` is not rendered, `windowStats=null`, `radarrUrl` and Discord fields are not passed (settings modal is not mounted).
- `hiddenFilter` is forced to `"exclude"` and the toggle is not rendered.
- Components receive an explicit `viewer: "anonymous" | "user"`-style flag (`isAnonymous`) to swap vote/comment affordances for the sign-in prompt.

**Rationale**: FR-008 requires the data to be absent, not merely hidden — RSC payloads are visible in the HTML. Computing `voteSummary` server-side is the smallest change that makes voter identities unreachable anonymously and simplifies the client.

## R8. Metadata leakage

**Decision**: `generateMetadata` in the list page calls `auth()` and only returns the list name when `resolveListAccess` grants access; otherwise returns the generic "List" title. The history page's `generateMetadata` gets the same treatment.

**Rationale**: Spec edge case — Site-members/Private lists must not expose their name to unauthenticated fetches (link unfurlers hit the page anonymously).

## R9. Discovery queries and API contract

**Decision**: Every `where: { isPublic: true }` used for discovery by signed-in users becomes `visibility: { in: [PUBLIC, MEMBERS] }`. `POST /api/lists` and `PATCH /api/lists/[slug]` accept `visibility` (validated via `parseListVisibility`) and no longer accept `isPublic`. E2E specs and `scripts/seed-demo.ts` are updated from `isPublic: true/false` to `visibility: "MEMBERS"/"PRIVATE"`.

**Rationale**: For a signed-in user, both PUBLIC and MEMBERS lists are browsable, so discovery semantics are unchanged. Dropping `isPublic` from the API avoids a shim that would have to be removed later; the API is first-party only.

## R10. Sign-in prompt placement

**Decision**: One `AnonymousListPrompt` client-free component rendered in the header's action slot (where Add/Settings would be) and reused inside the item modal in place of the comments section. Copy: "Sign in to vote and comment" linking to `/login?callbackUrl=/lists/<slug>` with a secondary "Create an account" link to `/register`.

**Rationale**: FR-009 asks for a single, clearly visible prompt that returns the visitor to the list. The header action slot is the established location for primary actions (content hierarchy: identity → primary actions). Mirroring it in the modal covers the case where the visitor reaches for vote/comment controls there.

## R11. Testing strategy

**Decision**:

- Vitest: `list-visibility.test.ts` covering `parseListVisibility` and the full `resolveListAccess` matrix (3 tiers × 3 viewer contexts).
- Playwright: new `e2e/lists-public.spec.ts` using a fresh browser context with no storage state to assert: PUBLIC list renders anonymously with items and the sign-in prompt, and without member/added-by/vote-control elements; MEMBERS list redirects to `/login?callbackUrl=`; PRIVATE list redirects to login; `GET /api/lists/[slug]` returns 200/401/403 per tier; Radarr feed returns 200 anonymously for PUBLIC and 401 for MEMBERS without a token. Existing `lists-*.spec.ts` updated for the new field and the three-option visibility selector.

## R12. Deployment path

**Decision**: "Deploy" for this repo means landing the commits on `main`. `release.yml` runs semantic-release on push to `main` (a `feat` commit produces a minor version), then builds and pushes `jamiebclark/screened:<version>` and `:latest` to Docker Hub; production hosts pull via `docker compose pull` (docs/deployment.md). The migration is applied on container start by `yarn db:migrate:deploy`.

**Rationale**: Recent history shows feature work committed directly to `main` (no merge commits). The plan therefore ends with: `yarn ci:check` green → fast-forward merge of `012-public-list-visibility` into `main` → push → watch the Release workflow with `gh run watch`. The push is confirmed with the owner before it happens.
