# Research: List Modes & Feature Toggles

## Decision Log

### 1. Drag-and-Drop Library

**Decision**: `@dnd-kit/sortable` (part of `@dnd-kit/core`)

**Rationale**: Most actively maintained DnD library for React 19. Fully tree-shakeable, TypeScript-first, and designed for accessibility. `react-beautiful-dnd` is deprecated; `react-dnd` is heavier and less idiomatic for React 19. `@dnd-kit` is the de-facto standard for new React projects.

**Alternatives considered**:

- `react-beautiful-dnd` — deprecated by Atlassian, no React 18/19 support
- `react-dnd` — heavier, more boilerplate, requires explicit backend setup
- Native HTML5 DnD — poor mobile support, limited accessibility

**Impact**: One new dev dependency. Drag handles only rendered for owners/contributors on ranked lists in list-view mode.

---

### 2. Position Storage Strategy

**Decision**: Sequential integers (1, 2, 3…) stored in `ListItem.position`, with full re-index on reorder.

**Rationale**: Lists are bounded (item cap max not constrained by spec, but real usage is expected to be small — typically <50 items). Sequential integers are trivial to render as rank numbers. A reorder operation sends `[{id, position}]` pairs in a single `PATCH /api/lists/[slug]/items/reorder` call, written in one Prisma transaction.

**Alternatives considered**:

- Fractional indexing (`lexorank`/float) — avoids full re-index but adds complexity; unnecessary for small lists
- Linked list (`nextId` pointer) — O(1) insert but expensive to read sorted order

**Impact**: Reorder API writes N rows per operation (acceptable for typical list sizes). Migration assigns `position = NULL` for existing items; position is only populated when `rankingEnabled = true`.

---

### 3. Ranking ↔ Voting Mutual Exclusion Enforcement

**Decision**: Application-layer enforcement in the API (PATCH handler checks and auto-clears the opposing flag). No DB constraint.

**Rationale**: A DB check constraint (`CHECK (NOT (rankingEnabled AND votingEnabled))`) would require a raw SQL migration. Since both fields are managed exclusively by our application, an application-level guard is sufficient and easier to maintain. The UI also previews the effect before the user saves.

**Alternatives considered**:

- Postgres `CHECK` constraint — more robust but requires raw SQL migration and adds friction
- UI-only enforcement — insufficient; could be bypassed by direct API calls

---

### 4. When Ranking Is Enabled on an Existing List

**Decision**: Assign sequential positions based on current `addedAt` ascending order.

**Rationale**: Matches spec assumption. Avoids arbitrary ordering surprises. The owner can then drag to re-order.

---

### 5. Display Mode Ownership

**Decision**: `displayMode` is a list-level field controlled only by the owner. Viewers always see the owner-configured display mode. No per-viewer preference.

**Rationale**: Explicitly stated in spec. Simplifies implementation (no user preference storage).

---

### 6. Item Cap Semantics

**Decision**: Cap applies only to new additions. Existing items are never auto-removed when a cap is set or lowered below the current count.

**Rationale**: Matches spec assumption. UI shows a warning if the current count already exceeds or equals the cap when the cap is set.

---

### 7. Votes Preservation When Switching Modes

**Decision**: `ListItemVote` rows are preserved when voting is disabled. Re-enabling voting restores them.

**Rationale**: Non-destructive; no data loss on mode change. UI simply hides vote controls and scores when `votingEnabled = false`.

---

### 8. Preset Definitions (Application Logic)

Presets are pure TypeScript constants, not stored in the DB.

| Preset    | rankingEnabled | votingEnabled | commentsEnabled | displayMode |
| --------- | -------------- | ------------- | --------------- | ----------- |
| Watchlist | false          | false         | true            | GRID        |
| Poll      | false          | true          | true            | GRID        |
| Ranked    | true           | false         | true            | LIST        |
| Custom    | false          | false         | true            | GRID        |

"Custom" starts with the same defaults as Watchlist but all toggles are user-editable.

---

### 9. Comments Toggle Behavior

**Decision**: When `commentsEnabled = false`, the comment section in the modal is hidden. The `POST /api/lists/[slug]/items/[itemId]/comments` route returns `403`.

**Rationale**: Matches FR-012. Comment reads, unread tracking, and badges are unaffected (they remain as-is when re-enabled).

---

### 10. Spoiler Reveal State

**Decision**: Reveal state is purely local React state (`useState`), never persisted to the server.

**Rationale**: Matches FR-007. No API change needed — just a UI wrapper component in both the modal and list-view row.
