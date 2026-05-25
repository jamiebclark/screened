# Data Model: First-Class Friends Hub

> No schema changes. All required models already exist in `prisma/schema.prisma`.

## Existing models used

### `Friendship`

Represents a confirmed, bidirectional connection between two users. Stored with normalised `userLowId` / `userHighId` (lower cuid alphabetically is always "low") to avoid duplicate rows.

| Field      | Type     | Notes                            |
| ---------- | -------- | -------------------------------- |
| id         | String   | cuid PK                          |
| userLowId  | String   | FK → User; alphabetically lower  |
| userHighId | String   | FK → User; alphabetically higher |
| createdAt  | DateTime |                                  |

Indexes: `userLowId`, `userHighId`. Unique on `(userLowId, userHighId)`.

**Query pattern for friends list**: two `findMany` queries — one where `userLowId = me`, one where `userHighId = me` — then merge the opposite side. Done in `GET /api/friends`.

---

### `FriendRequest`

Represents a pending, one-directional invitation.

| Field      | Type     | Notes                 |
| ---------- | -------- | --------------------- |
| id         | String   | cuid PK               |
| fromUserId | String   | FK → User (sender)    |
| toUserId   | String   | FK → User (recipient) |
| createdAt  | DateTime |                       |
| updatedAt  | DateTime |                       |

Unique on `(fromUserId, toUserId)`. Indexes: `toUserId`, `fromUserId`.

**Auto-accept rule**: `POST /api/friends` checks for a reverse request before creating a new one; if found, calls `createFriendshipAndClearPending()`.

---

### `WatchEntry` (read-only for activity snapshots)

Used to derive the most recent watch event per friend.

Relevant fields for `getRecentActivityPerFriend()`:

- `userId` — the watcher
- `tmdbId` — TMDB identifier (combined with `mediaType` to fetch title)
- `mediaType` — `MOVIE` | `TV`
- `watchedAt` — timestamp of the watch event

TMDB title text is **not** stored; it is fetched server-side via `getTitleDetails()` in `src/lib/tmdb.ts` using Next.js fetch caching.

---

## New lib function

### `getRecentActivityPerFriend(friendIds: string[]): Promise<Map<string, ActivitySnapshot>>`

**Location**: `src/lib/friends-queries.ts`

```ts
type ActivitySnapshot = {
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  title: string; // fetched from TMDB
  watchedAt: Date;
};
```

**Algorithm**:

1. Prisma `groupBy` on `WatchEntry` (`by: ['userId']`, `_max: { watchedAt }`) filtered to `friendIds` → one max timestamp per friend.
2. For each `(userId, maxWatchedAt)` pair, `findFirst` on `WatchEntry` to get `tmdbId` + `mediaType`.
3. `Promise.all` on TMDB title lookups (server-side, Next.js fetch-cached).
4. Return `Map<userId, ActivitySnapshot>` (missing entries = friend has no watch history).

---

## Entity summary

| Entity        | Changed? | Notes                                         |
| ------------- | -------- | --------------------------------------------- |
| Friendship    | No       | Read in page RSC via new lib function         |
| FriendRequest | No       | Read in page RSC; mutated via existing routes |
| WatchEntry    | No       | Read-only in `getRecentActivityPerFriend()`   |
| User          | No       | `id`, `name`, `avatarUrl` selected as before  |
