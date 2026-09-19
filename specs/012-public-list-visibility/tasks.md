# Tasks: Public List Visibility

**Input**: Design documents from `/specs/012-public-list-visibility/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the spec's success criteria (SC-003, SC-004) call for automated assertions and the constitution requires Vitest for lib logic and Playwright for list journeys.

**Organization**: Tasks are grouped by user story. US3 (migration safety) is delivered by the Foundational phase because the migration is a prerequisite for everything else; its verification task lives in its own phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

Single Next.js project. `src/app/(app)/` = auth-guarded routes, `src/app/(public)/` = routes that render without a session, `src/app/api/` = route handlers, `src/lib/` = business logic, `e2e/` = Playwright, `prisma/` = schema + migrations.

---

## Phase 1: Setup

**Purpose**: Confirm the local environment can run migrations and tests before touching schema.

- [ ] T001 Verify `DATABASE_URL` in `.env` reaches a local Postgres and `yarn prisma migrate status` reports no pending migrations on `012-public-list-visibility`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, generated client, and the pure access helper that every story depends on. Also delivers US3 (existing lists keep their audience) by construction.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Add `enum ListVisibility { PUBLIC MEMBERS PRIVATE }` and replace `isPublic Boolean @default(true)` with `visibility ListVisibility @default(MEMBERS)` on `model List` in `prisma/schema.prisma`
- [ ] T003 Scaffold the migration with `yarn prisma migrate dev --create-only --name add_list_visibility_tier`, then edit `prisma/migrations/<ts>_add_list_visibility_tier/migration.sql` to match data-model.md exactly: CREATE TYPE → ADD COLUMN (default MEMBERS) → `UPDATE "List" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false` → DROP COLUMN `isPublic`
- [ ] T004 Apply the migration with `yarn db:migrate` and regenerate the client with `yarn db:generate`; confirm `src/generated/prisma/` now exports `ListVisibility` and `List` no longer has `isPublic`
- [ ] T005 Commit T002–T004 together as `feat(db): add three-tier list visibility enum and migrate isPublic` (schema + migration folder + generated client)
- [ ] T006 [P] Create `src/lib/list-visibility.ts` exporting `ListVisibility` const mirror + type, `LIST_VISIBILITY_OPTIONS` (value/label/description/icon per contracts/list-page-anonymous.md), `DEFAULT_LIST_VISIBILITY = "MEMBERS"`, `parseListVisibility(input: unknown)`, `isDiscoverableVisibility` filter constant `["PUBLIC","MEMBERS"]`, and `resolveListAccess({ visibility, hasSession, isMember })` returning `"granted" | "login" | "forbidden"` per the data-model truth table
- [ ] T007 [P] Create `src/lib/list-visibility.test.ts` (Vitest) covering all six `resolveListAccess` rows, `parseListVisibility` accepting the three values and rejecting `undefined`, `"public"` (wrong case), `true`, and `""`
- [ ] T008 Run `yarn test -- src/lib/list-visibility.test.ts`; commit T006–T007 as `feat(lists): add list-visibility helpers and access resolver`
- [ ] T009 Create `src/lib/app-shell.ts` exporting `loadSignedInShell(session, currentPath)` that performs the user-existence check (→ `redirect('/api/auth/sign-out-redirect?callbackUrl=…')`), onboarding check (→ `redirect('/onboarding?callbackUrl=…')`), and returns `{ unreadNotifications }`, extracted verbatim from `src/app/(app)/layout.tsx`
- [ ] T010 Refactor `src/app/(app)/layout.tsx` to call `loadSignedInShell` after its own no-session redirect, and `src/app/(public)/layout.tsx` to call it only when `session?.user` exists (anonymous requests render `Nav` with `user={null}` and `initialUnreadNotifications={0}` as today)
- [ ] T011 Run `yarn lint` on the two layouts and `src/lib/app-shell.ts`; commit T009–T010 as `refactor(app): share signed-in shell loading between app and public layouts`

**Checkpoint**: Schema migrated, helper tested, both layouts share signed-in shell logic. Every remaining `isPublic` reference in `src/` is now a type error — the next phases fix them story by story.

---

## Phase 3: User Story 5 - Integrations and data access follow the same rules (Priority: P2, done first because US1 depends on it)

**Goal**: `GET /api/lists/[slug]`, `POST /api/lists`, `PATCH /api/lists/[slug]`, the Radarr feed, and discovery queries enforce the tier matrix.

**Independent Test**: With three lists (one per tier), `curl` the list endpoint and the Radarr feed with no cookie, with a non-member cookie, and with a member cookie; status codes match contracts/list-visibility-api.md.

- [ ] T012 [US5] In `src/app/api/lists/[slug]/route.ts` `GET`: compute `isMember` (owner or `ListMember`), call `resolveListAccess`, return `401 { error: "Unauthorized" }` for `login`, `403 { error: "Forbidden" }` for `forbidden`; when granted and there is no session, return the anonymous-safe shape (`members: []`, `owner: null`, strip `radarrToken`, `discordWebhookId`, `discordChannelName`, `discordGuildName`, and set each `items[].addedBy` to `null`); keep stripping `discordWebhookUrl` for everyone
- [ ] T013 [US5] In `src/app/api/lists/[slug]/route.ts` `PATCH`: replace `isPublic?: boolean` with `visibility?: string` in the body type, validate with `parseListVisibility` (400 `"Invalid visibility"` when present but invalid), and write `visibility` in every `prisma.list.update` data block that previously wrote `isPublic`
- [ ] T014 [US5] In `src/app/api/lists/route.ts`: `POST` reads `visibility` (default `DEFAULT_LIST_VISIBILITY`, 400 on invalid) instead of `isPublic`; `GET` discovery `where` uses `visibility: { in: DISCOVERABLE_VISIBILITIES }` instead of `isPublic: true`
- [ ] T015 [US5] In `src/app/api/lists/[slug]/radarr/route.ts`: replace `if (!list.isPublic)` with `if (list.visibility !== ListVisibility.PUBLIC)` so MEMBERS and PRIVATE both require `?token`; update the doc comment
- [ ] T016 [P] [US5] Replace `isPublic: true` with `visibility: { in: DISCOVERABLE_VISIBILITIES }` in the discovery query in `src/app/(app)/lists/page.tsx`
- [ ] T017 [P] [US5] Replace `isPublic: true` with `visibility: { in: DISCOVERABLE_VISIBILITIES }` in the discovery query in `src/components/title-lists-section.tsx`
- [ ] T018 [US5] Add `GET /api/lists/[^/]+$` (method `GET` only) to the pass-through rules in `src/proxy.ts` so anonymous API reads reach the handler instead of the login redirect
- [ ] T019 [US5] Commit T012–T018 as `feat(lists): enforce visibility tiers in list API and radarr feed`

**Checkpoint**: API matrix enforced. Page still under `(app)` (anonymous page access arrives in US1).

---

## Phase 4: User Story 1 - Share a list with anyone (Priority: P1) 🎯 MVP

**Goal**: A logged-out visitor can open a PUBLIC list and see a read-only view; MEMBERS/PRIVATE redirect to login.

**Independent Test**: Set a list to PUBLIC (via `PATCH` from US5 or Prisma Studio), open `/lists/<slug>` in an incognito window: items render, sign-in prompt shown, no members/added-by/controls. Set to MEMBERS → redirect to `/login?callbackUrl=…`.

### Routing

- [ ] T020 [US1] `git mv "src/app/(app)/lists/[slug]" "src/app/(public)/lists/[slug]"` (entire subtree incl. `history/`, `loading.tsx`, all components); fix any relative imports that break
- [ ] T021 [US1] Add page pass-through `^/lists/(?!new$)[^/]+$` to `src/proxy.ts` (keep `/lists`, `/lists/new`, and `/lists/[slug]/history` behind the login redirect)
- [ ] T022 [US1] In `src/app/(public)/lists/[slug]/page.tsx`: replace the `if (!list.isPublic && !isMember)` block with `resolveListAccess({ visibility: list.visibility, hasSession: !!userId, isMember: isMember || isOwner })` → `login` ⇒ `redirect('/login?callbackUrl=/lists/<slug>')`, `forbidden` ⇒ render `PrivateListGate`; derive `const isAnonymous = !userId`
- [ ] T023 [US1] In `src/app/(public)/lists/[slug]/page.tsx` `generateMetadata`: select `visibility`, `ownerId`, `members.userId`; call `auth()`; return the list name only when `resolveListAccess` is `granted`, else `{ title: "List" }`
- [ ] T024 [P] [US1] In `src/app/(public)/lists/[slug]/history/page.tsx` `generateMetadata`: apply the same guard (owner/member only, since the page itself requires membership)

### Anonymous view model (server)

- [ ] T025 [US1] In `src/app/(public)/lists/[slug]/list-items-grid.tsx` change `GridItem`: `addedBy` → `{ id; name; avatarUrl } | null`; remove `votes`; add `voteSummary: { up: number; down: number; userVote: 1 | -1 | null }`; add `isAnonymous: boolean` to `ListItemsGridProps` and the inner grid props
- [ ] T026 [US1] In `src/app/(public)/lists/[slug]/page.tsx` `toGridItem`: compute `voteSummary` from `item.votes` + `userId`; accept an `isAnonymous` flag that sets `addedBy: null`, `watchedBy: []`, `watchingBy: []`, `unreadCommentCount: 0`; skip the `memberStatuses` and `listItemCommentRead` queries when anonymous; force `hiddenFilter = "exclude"` when anonymous
- [ ] T027 [US1] In `src/app/(public)/lists/[slug]/page.tsx` JSX: pass `isAnonymous` to `ListPageHeader`, `ListItemsGrid`, `ListItemReorder`; when anonymous pass `memberAvatars=[]`, `members=[]`, `windowStats=null`, `radarrUrl=""`, `connectedChannelName=null`, `connectedGuildName=null`, `watchedCount=0`; do not render `ListHiddenFilter` (neither in the controls row nor in the "every item is hidden" empty state) when anonymous

### Anonymous affordances (client)

- [ ] T028 [P] [US1] Create `src/app/(public)/lists/[slug]/anonymous-list-prompt.tsx` (no `"use client"`): renders a `Button asChild` link "Sign in to vote and comment" → `/login?callbackUrl=${encodeURIComponent('/lists/' + slug)}` plus a `text-sm text-muted-foreground` "or create an account" link → `/register`; accepts `slug` and optional `compact` prop for the modal variant
- [ ] T029 [US1] In `src/app/(public)/lists/[slug]/list-page-header.tsx`: add `isAnonymous` prop; when true render the badge/name/description/item-count only (no member avatars, no member count, no watched-count), render `<AnonymousListPrompt slug={listSlug} />` in the action slot alongside the Stats and Tags buttons, and do not mount `ListSettingsModal`, `ListAddFab`, or the History link; ensure the action slot stacks under the title at phone width (`flex-col sm:flex-row`)
- [ ] T030 [US1] In `src/app/(public)/lists/[slug]/list-items-grid.tsx` inner grid: use `item.voteSummary` for the pill; render the added-by avatar only when `item.addedBy` is non-null; hide-toggle already gated by `canCurate`
- [ ] T031 [P] [US1] In `src/app/(public)/lists/[slug]/list-items-list-view.tsx`: use `item.voteSummary`; render added-by avatar/name only when `item.addedBy` is non-null; thread `isAnonymous` through `ListItemsListView` props
- [ ] T032 [P] [US1] In `src/app/(public)/lists/[slug]/list-item-reorder.tsx`: accept and forward `isAnonymous` to `ListItemsListView` and `ListItemModal`
- [ ] T033 [US1] In `src/app/(public)/lists/[slug]/list-item-modal.tsx`: accept `isAnonymous` + `listSlug` (already present); use `item.voteSummary`; render added-by row only when `item.addedBy` is non-null; skip watched-by/watching sections when empty (already conditional); when `isAnonymous` replace the comments section with `<AnonymousListPrompt slug={listSlug} compact />`; keep notes/spoiler behaviour unchanged
- [ ] T034 [US1] Run `yarn lint` on all files under `src/app/(public)/lists/[slug]/` and `yarn build`-level type check (`yarn tsc --noEmit` or `yarn build`); commit T020–T024 as `feat(lists): serve list pages without a session` and T025–T033 as `feat(lists): render an anonymous read-only view for public lists`

**Checkpoint**: MVP — a PUBLIC list is viewable anonymously; MEMBERS/PRIVATE redirect. Owners can only set PUBLIC via API until US2 lands.

---

## Phase 5: User Story 2 - Choose who can see a list (Priority: P1)

**Goal**: Owners pick Public / Site members / Private on creation and in settings, with the FR-012 copy.

**Independent Test**: Create a list choosing each option; open settings and switch tiers; the persisted `visibility` and header badge match.

- [ ] T035 [P] [US2] In `src/app/(app)/lists/new/page.tsx`: replace the two-option visibility radio with a map over `LIST_VISIBILITY_OPTIONS` (icon + label + description), `defaultChecked` on `MEMBERS`, and post `visibility: form.get("visibility")` instead of `isPublic`
- [ ] T036 [P] [US2] In `src/app/(public)/lists/[slug]/list-settings-panel.tsx`: replace `isPublic` state/prop with `visibility: ListVisibility`; render the three options from `LIST_VISIBILITY_OPTIONS` with lucide icons `Globe`/`Users`/`Lock`; dirty-check on `visibility !== initialVisibility`; send `visibility` in the PATCH body; show the existing "non-members will lose access" warning when the new value is `PRIVATE` and the initial value was not
- [ ] T037 [US2] In `src/app/(public)/lists/[slug]/list-settings-modal.tsx` and `list-page-header.tsx`: rename the `isPublic` prop to `visibility: ListVisibility` and pass it through from `page.tsx`
- [ ] T038 [US2] Commit T035–T037 as `feat(lists): choose between public, site-members and private visibility`

**Checkpoint**: Owners control the tier end-to-end from the UI.

---

## Phase 6: User Story 3 - Existing lists keep their current audience (Priority: P1)

**Goal**: Prove the migration backfill did what FR-004 / SC-002 require.

**Independent Test**: On a database that had both public and private lists before T004, no row has `visibility = 'PUBLIC'` and every previously-private row is `PRIVATE`.

- [ ] T039 [US3] Verify against the local dev database: `yarn prisma db execute --stdin <<< "SELECT visibility, count(*) FROM \"List\" GROUP BY 1"` shows zero `PUBLIC` rows; record the counts in the PR/commit description. If the dev DB had no private lists, seed one on a throwaway branch of the DB before the migration (or reset with `yarn prisma migrate reset` + `yarn db:seed-demo` and re-run the check on the seed data)
- [ ] T040 [P] [US3] Update `scripts/seed-demo.ts`: `isPublic: true` → `visibility: "MEMBERS"` (both occurrences)

---

## Phase 7: User Story 4 - Tier is visible everywhere a list appears (Priority: P2)

**Goal**: Cards, header, and title-page section show a distinct icon + label per tier.

**Independent Test**: Create one list per tier; `/lists`, `/lists/<slug>`, and a title page containing the list each show Globe/"Public", Users/"Site members", Lock/"Private".

- [ ] T041 [P] [US4] Add a small shared `ListVisibilityBadge` (icon + label from `LIST_VISIBILITY_OPTIONS`, `text-xs text-muted-foreground`, accepts `visibility` and optional `suffix` like " list") in `src/components/list-visibility-badge.tsx`
- [ ] T042 [P] [US4] In `src/components/list-card.tsx`: replace the `isPublic` prop with `visibility: ListVisibility` and render `ListVisibilityBadge`
- [ ] T043 [P] [US4] In `src/components/title-lists-section.tsx`: pass `visibility` to `ListCard` (or render the badge) for each list
- [ ] T044 [US4] In `src/app/(public)/lists/[slug]/list-page-header.tsx`: replace the inline Globe/Lock badge with `ListVisibilityBadge visibility={visibility} suffix=" list"`
- [ ] T045 [US4] In `src/app/(app)/lists/page.tsx`: pass `visibility` into `ListCard` wherever `isPublic` was passed
- [ ] T046 [US4] Commit T041–T045 as `feat(lists): show the visibility tier on list cards and headers`

---

## Phase 8: Tests

**Purpose**: Cover the anonymous journeys and update existing specs for the API contract change.

- [ ] T047 Update request bodies in `e2e/lists.spec.ts`, `e2e/lists-advanced.spec.ts`, `e2e/lists-challenge.spec.ts`, `e2e/lists-curation.spec.ts`, `e2e/lists-edit.spec.ts`, `e2e/lists-poll.spec.ts`, `e2e/lists-ranked.spec.ts`, `e2e/search.spec.ts`: `isPublic: true` → `visibility: "MEMBERS"`, `isPublic: false` → `visibility: "PRIVATE"`; update any assertions that click/read the "Public"/"Private" radio labels to the new three-option selector (e.g. `getByLabel("Site members")`)
- [ ] T048 In `e2e/lists-advanced.spec.ts`, the Radarr cases: a MEMBERS list now requires a token (401 without); add a PUBLIC list case that returns 200 without a token
- [ ] T049 Create `e2e/lists-public.spec.ts` using `browser.newContext({ storageState: undefined })` for anonymous requests: (a) PUBLIC list page renders name + item titles + "Sign in to vote and comment" and contains no member avatars, no added-by avatars, no `aria-label="Add item to list"`, no settings button; (b) MEMBERS list → URL matches `/login?callbackUrl=%2Flists%2F…`; (c) PRIVATE list → same redirect; (d) `GET /api/lists/<slug>` anonymous returns 200 for PUBLIC with `members: []` and `owner: null` and no `radarrToken`, 401 for MEMBERS, 401 for PRIVATE; (e) signed-in non-member GET returns 403 for PRIVATE; (f) `/lists/<public-slug>` `<title>` equals the list name and `/lists/<members-slug>` anonymous title is "List" (fetch the HTML with `request.get`)
- [ ] T050 Run `yarn test` and `yarn test:e2e -- e2e/lists-public.spec.ts e2e/lists-advanced.spec.ts e2e/lists-edit.spec.ts`; fix failures; commit T040, T047–T049 as `test(lists): cover anonymous access to public lists`

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T051 [P] Update `README.md` lists feature description to name the three visibility tiers and note that Public lists are viewable without an account; commit as `docs(readme): describe list visibility tiers`
- [ ] T052 Responsive verification per `docs/ui-ux-standards.md`: screenshot the anonymous PUBLIC list page (grid and list display modes) and the item modal at ~390px and desktop; confirm the sign-in prompt stacks under the title, no horizontal scroll, modal capped at `max-h-[85vh]`; fix and commit any layout issues as `fix(lists): …`
- [ ] T053 `grep -rn "isPublic" src e2e scripts` returns only `isPublicSignupAllowed` references (auth), nothing list-related
- [ ] T054 Run `yarn ci:check` on `012-public-list-visibility`; all green
- [ ] T055 Deploy (confirm with the owner first): `git checkout main && git merge --ff-only 012-public-list-visibility && git push origin main`; `gh run watch` until the Release workflow's `release` and `docker` jobs succeed; report the new version tag and image tag

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)**: schema + helper + layouts. Blocks everything.
- **Phase 3 (US5 API)** first among stories: the page (US1) reuses `resolveListAccess` semantics and the proxy exemption pattern; discovery queries must compile before `yarn build` passes.
- **Phase 4 (US1)** depends on Phase 3 (compiles only once `isPublic` is gone from routes).
- **Phase 5 (US2)** depends on Phase 4 (settings panel/modal live in the moved directory).
- **Phase 6 (US3)** verification can run any time after T004; T040 is independent.
- **Phase 7 (US4)** depends on Phase 4 (header file location) but is otherwise independent of US2.
- **Phase 8 (Tests)** after all stories; **Phase 9** last.

### User story dependency graph

```
Foundational ──► US5 (API) ──► US1 (anonymous page) ──► US2 (selector UI)
                                        │
                                        └──────────────► US4 (badges)
Foundational ──► US3 (migration verification)  [independent]
```

### Parallel opportunities

- Phase 2: T006 ‖ T007 (lib + test) while T009–T010 (layouts) proceed.
- Phase 3: T016 ‖ T017 after T014.
- Phase 4: T024 ‖ T028 ‖ T031 ‖ T032 once T025 (type change) is in.
- Phase 5: T035 ‖ T036.
- Phase 7: T041 ‖ T042 ‖ T043.
- Phase 9: T051 alongside T052.

---

## Implementation Strategy

**MVP = Phases 1–4** (Foundational + US5 + US1): after these a list flipped to PUBLIC via the API is viewable by anyone, and nothing else regresses. **Then** US2 gives owners the UI control, US4 the badges, and Phase 8 locks it with tests before Phase 9 ships to `main`.

Each phase ends in one or two Conventional Commits as listed, matching the commit plan in plan.md.
