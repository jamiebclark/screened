# Data Model: Public List Visibility

**Feature**: 012-public-list-visibility · **Date**: 2026-09-19

## Schema changes (`prisma/schema.prisma`)

### New enum

```prisma
enum ListVisibility {
  PUBLIC   // anyone on the internet, no session required
  MEMBERS  // any authenticated Screened user
  PRIVATE  // list owner + ListMember rows only
}
```

### `List` model

| Field        | Before                   | After                              |
| ------------ | ------------------------ | ---------------------------------- |
| `isPublic`   | `Boolean @default(true)` | **removed**                        |
| `visibility` | —                        | `ListVisibility @default(MEMBERS)` |

No other `List` fields change. `radarrToken` keeps its role: the secret substitute for a session on the Radarr feed for non-PUBLIC lists.

### Migration `add_list_visibility_tier`

```sql
-- 1. enum
CREATE TYPE "ListVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'PRIVATE');

-- 2. column, defaulting every existing row to MEMBERS (today's "public")
ALTER TABLE "List" ADD COLUMN "visibility" "ListVisibility" NOT NULL DEFAULT 'MEMBERS';

-- 3. backfill: today's private lists stay private
UPDATE "List" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false;

-- 4. drop the old flag
ALTER TABLE "List" DROP COLUMN "isPublic";
```

Invariant after migration: `SELECT count(*) FROM "List" WHERE visibility = 'PUBLIC'` = 0 (SC-002).

## Client-safe mirror (`src/lib/list-visibility.ts`)

```ts
export const ListVisibility = {
  PUBLIC: "PUBLIC",
  MEMBERS: "MEMBERS",
  PRIVATE: "PRIVATE",
} as const;
export type ListVisibility =
  (typeof ListVisibility)[keyof typeof ListVisibility];

export const LIST_VISIBILITY_OPTIONS: {
  value: ListVisibility;
  label: string; // "Public" | "Site members" | "Private"
  description: string; // FR-012 copy
  icon: "globe" | "users" | "lock";
}[];

export const DEFAULT_LIST_VISIBILITY = ListVisibility.MEMBERS;

export function parseListVisibility(input: unknown): ListVisibility | null;

export type ListAccessDecision = "granted" | "login" | "forbidden";
export function resolveListAccess(args: {
  visibility: ListVisibility;
  hasSession: boolean;
  isMember: boolean; // owner OR ListMember row
}): ListAccessDecision;
```

### `resolveListAccess` truth table (FR-010)

| visibility | hasSession | isMember | result      |
| ---------- | ---------- | -------- | ----------- |
| PUBLIC     | any        | any      | `granted`   |
| MEMBERS    | false      | —        | `login`     |
| MEMBERS    | true       | any      | `granted`   |
| PRIVATE    | false      | —        | `login`     |
| PRIVATE    | true       | false    | `forbidden` |
| PRIVATE    | true       | true     | `granted`   |

Consumers map the decision to their surface:

| Surface                        | `login`                                   | `forbidden`                   |
| ------------------------------ | ----------------------------------------- | ----------------------------- |
| List page (RSC)                | `redirect('/login?callbackUrl=/lists/…')` | render `PrivateListGate`      |
| `generateMetadata`             | generic title "List"                      | generic title "List"          |
| `GET /api/lists/[slug]`        | `401 { error: "Unauthorized" }`           | `403 { error: "Forbidden" }`  |
| `GET /api/lists/[slug]/radarr` | `401` unless `?token` matches             | `401` unless `?token` matches |

## View model changes (`GridItem`, `src/app/(public)/lists/[slug]/list-items-grid.tsx`)

| Field                      | Before                    | After                                                     |
| -------------------------- | ------------------------- | --------------------------------------------------------- |
| `addedBy`                  | `{ id, name, avatarUrl }` | `{ id, name, avatarUrl } \| null` — `null` for anonymous  |
| `votes`                    | `{ value, userId }[]`     | **removed**                                               |
| `voteSummary`              | —                         | `{ up: number; down: number; userVote: 1 \| -1 \| null }` |
| `watchedBy` / `watchingBy` | member arrays             | unchanged type; always `[]` for anonymous                 |
| `unreadCommentCount`       | number                    | unchanged; always `0` for anonymous                       |

New prop threaded through `ListItemsGrid`, `ListItemReorder`, `ListItemsListView`, `ListItemModal`: `isAnonymous: boolean`.

## Viewer context (derived, not stored)

```
anonymous  : no session
user       : session, not owner, not member
member     : ListMember row (CONTRIBUTOR/VIEWER) or owner
owner      : list.ownerId === session.user.id
```

`isAnonymous` gates data shape (server) and affordances (client). `isMember`/`isOwner`/`canCurate` are unchanged from today.

## Discovery queries

| Location                                 | Before           | After                                       |
| ---------------------------------------- | ---------------- | ------------------------------------------- |
| `src/app/(app)/lists/page.tsx`           | `isPublic: true` | `visibility: { in: ["PUBLIC", "MEMBERS"] }` |
| `src/app/api/lists/route.ts` (GET)       | `isPublic: true` | `visibility: { in: ["PUBLIC", "MEMBERS"] }` |
| `src/components/title-lists-section.tsx` | `isPublic: true` | `visibility: { in: ["PUBLIC", "MEMBERS"] }` |

Anonymous discovery is out of scope (spec Assumptions) — no query returns PUBLIC lists to a viewer without a session.
