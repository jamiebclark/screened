# Quickstart: Friends Hub Development

## Prerequisites

- Postgres running, `.env` with `DATABASE_URL`
- `yarn install` done

## Dev workflow

```bash
yarn dev          # localhost:3000
```

No migrations needed — all models exist.

## Key files to touch

| File                                       | Change                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `src/components/nav.tsx`                   | Add `{ href: "/friends", label: "Friends", icon: Users }` to `navLinks`      |
| `src/app/(app)/settings/settings-nav.tsx`  | Remove `{ href: "/settings/friends", label: "Friends" }` from `generalItems` |
| `src/app/(app)/settings/friends/page.tsx`  | Replace with `redirect('/friends')`                                          |
| `src/lib/friends-queries.ts`               | New: `getRecentActivityPerFriend()`                                          |
| `src/app/(app)/friends/page.tsx`           | New: RSC friends hub                                                         |
| `src/app/(app)/friends/loading.tsx`        | New: skeleton                                                                |
| `src/components/friend-requests-panel.tsx` | New: `"use client"` request management                                       |
| `src/components/find-friends-panel.tsx`    | New: `"use client"` search + add                                             |

## Testing the feature manually

1. Navigate to `/friends` — verify friends list and activity snapshots render
2. Check "Friends" appears in main nav (desktop and mobile)
3. Confirm Settings nav no longer shows "Friends"
4. Navigate to `/settings/friends` — verify redirect to `/friends`
5. With two accounts: send, accept, and decline friend requests from the hub
6. Use the Find Friends search — verify "Already friends" and "Request sent" states

## Running tests

```bash
yarn test:e2e -- e2e/friends-hub.spec.ts   # new E2E spec
yarn lint                                   # check touched files
yarn ci:check                               # full CI gate
```
