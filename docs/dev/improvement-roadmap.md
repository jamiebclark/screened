# Improvement Roadmap

Full-app audit conducted 2026-04-27. Items are grouped by session/theme and ordered by impact. Check off as completed.

---

## Session 1 — Quick Wins (CI, micro-polish)

Low-risk, high-signal changes. No refactoring.

### CI & tooling
- [x] Add `tsc --noEmit` step to `.github/workflows/ci.yml` before the build step
- [x] Add coverage to `vitest.config.ts` with 40% floor on `src/lib/**` (`@vitest/coverage-v8` added as devDependency)
- [x] Enable Dependabot for npm dependency updates (`.github/dependabot.yml`)

### Micro-polish
- [x] **Status color tokens** — replaced hardcoded `text-green-400 / text-yellow-400 / text-blue-400` across `media-card.tsx`, `watch-status-button.tsx`, `episode-tracker.tsx`, `page.tsx`, `profile/[userId]/page.tsx`, `watching/page.tsx`, `watchlist/page.tsx` with `text-status-watched / text-status-watching / text-status-watchlist / text-status-dropped` tokens defined in `globals.css`
- [x] **`isPending` spinner** — `watch-status-button.tsx` now shows a `Loader2` spinner and hides the chevron during mutation
- [x] **Weight button tooltips** — `pick-session.tsx` WEIGHTS array now includes `title` descriptions passed to each button

---

## Session 2 — Picker Refactor

The picker is the most distinctive feature and the roughest. Do this as a focused session — don't mix with other changes.

### Structural
- [x] **Split `pick-session.tsx`** (2,454 lines) into focused sub-components:
  - `picker-form.tsx` — attractors, repellers, filter controls, participant search
  - `picker-results.tsx` — scored movie cards, ranked list, score breakdown
  - `picker-activity.tsx` — sidebar activity feed
  - `pick-session.tsx` — session shell, state orchestration (~350 lines)
- [x] **Hardcoded scoring constants** — documented `REPELLER_LAMBDA=0.7` and `MAX_TO_EMBED=48` with comments explaining the tuning rationale in `movie-discovery-score.ts` and `movie-library-score.ts`

### Reliability
- [x] **Failure toasts** — added user-visible toasts for:
  - Failed PATCH requests in `use-picker-room-sync.ts`
  - `MovieSearchInput` 500 responses
  - SSE → polling fallback: Radio/WifiOff indicator in session header + `isPollFallback` state
- [x] **Toast infrastructure** — built Radix `@radix-ui/react-toast` system (`toast.tsx`, `use-toast.ts`, `toaster.tsx`) wired into app layout

### UX
- [x] **Score explanation** — expandable `ScoreBreakdown` inline component on `ScoredMovieCard` showing attractor similarity % and repeller penalty contribution
- [x] **First-run "dirty criteria" prompt** — `firstRunReady` flag shows "You're all set — click 'Find movies'" prompt when attractors are added but no run has occurred yet
- [x] **Undo dismiss** — dismissing a result shows a toast with an Undo action that removes the movie from `vetoIds` and `repellers`

---

## Session 3 — Visual Polish

### Loading states
- [x] `loading.tsx` skeleton for home page — poster grid + stats cards
- [x] `loading.tsx` skeleton for watchlist/watching/dropped pages — poster grid
- [x] `loading.tsx` skeleton for lists page — list card grid
- [x] `loading.tsx` skeleton for search results

### Empty states
- [x] **History** — new empty state with Plex and Letterboxd CTA buttons linking to settings
- [x] **Watchlist / watching / dropped** — empty states now include a "Search titles" CTA button linking to `/search`
- [x] **Pick page** — first-visit "How it works" explainer panel with attractor/repeller explanation and step-by-step hint

### Typography & spacing
- [x] **Arbitrary Tailwind values** — replaced `text-[10px]` → `text-2xs` (new `--font-size-2xs: 0.625rem` token), `w-[72px]` → `w-18`, `h-[108px]` → `h-27`, `w-[3.5rem]` → `w-14` across picker files and `media-card.tsx`
- [x] **Nav active state** — upgraded from `bg-accent` (indistinguishable from hover) to `bg-primary/10 text-primary` for clear brand-colored active indicator

### Nice-to-have
- [x] "You might also like" section on movie and TV detail pages using TMDB `/similar` endpoint; new `getTvSimilar` added to `tmdb.ts`

---

## Session 4 — Test Coverage

Current state at completion: 20 test files, 145 unit tests passing.

### High priority (security/auth critical paths)
- [ ] Unit tests for `src/lib/auth.ts` — deeply coupled to NextAuth internals; deferred (no pure functions to isolate without extensive framework mocking)
- [x] Unit tests for `src/lib/friendship.ts` — `areFriends` (self-check, sorted id query) and all 6 `getProfileFriendState` branches using `vi.hoisted` + `vi.resetAllMocks`
- [x] Unit tests for `src/lib/list-access-requests.ts` — `listAdminUserIdsForList` (found/not-found), `notifyAdminsOfPendingAccessRequest`, `markAccessRequestNotificationsRead`
- [x] Unit tests for `src/lib/safe-callback-path.ts` — 11 tests covering null, non-string, external URL, protocol-relative, newline injection, and valid paths

### Picker
- [x] Expanded `e2e/pick-session-activity.spec.ts` — added first-visit explainer, form section headings, filter section, and share button visibility tests
- [x] Unit tests for `src/lib/movie-discovery-score.ts` — `yearFromTmdbDate`, `yearInRange`, `matchesPerson` pure helpers exported and tested (22 tests)

---

## Session 5 — Onboarding & Landing Page

### Picker discoverability
- [x] First-visit "How it works" panel added directly to the pick page form (see Session 3)
- [x] Step 3 "Movie Night Picker" card added to onboarding flow (`/onboarding`) — explains attractors → shared room → ranked results with a link to `/pick`

### Public landing page
- [x] Login page enhanced with a 3-column feature grid (Track / Discover / Pick with friends) above the sign-in form, giving first-time visitors context before logging in

---

## Audit notes (reference)

**Strengths identified:**
- Strong semantic color token system and CVA-based component variants
- Movie detail page layout is genuinely Letterboxd-tier (backdrop hero, gradient overlay, info cluster)
- Episode tracker is elite UX — collapsible seasons, progress bars, bulk actions, confirmation dialogs
- Consistent mobile-first responsive grid strategy across all pages
- TypeScript strict mode on, zero `any` casts in `src/`
- No TODO/FIXME/HACK in codebase
- `scripts/ci-check.mjs` mirrors CI exactly — local parity is good
- Prisma migration discipline enforced in docs

**What makes it feel "generic Tailwind" (addressed above):**
- Hardcoded status colors outside the token system ✓
- Missing loading states on poster-grid-heavy pages ✓
- No feedback during button mutations ✓
- Generic empty states without contextual guidance ✓
