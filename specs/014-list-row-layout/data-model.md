# Data Model: List Row Layout — Rank Badge & Overview Fallback

**Feature**: `014-list-row-layout` | **Date**: 2026-09-20

No Prisma model, migration, API payload, or `GridItem` type changes (FR-016). This document records
the fields the row consumes and the two values derived from them at render time.

## Consumed input: `GridItem` (unchanged)

Defined in `src/app/(public)/lists/[slug]/list-items-grid.tsx`; built by `makeGridItem` in
`page.tsx`. Fields read by `ListRow`:

| Field                                                  | Type                          | Used for                                |
| ------------------------------------------------------ | ----------------------------- | --------------------------------------- |
| `id`                                                   | `string`                      | row key, select / hide callbacks        |
| `displayRank`                                          | `number \| undefined`         | rank badge (only when `rankingEnabled`) |
| `isHidden`                                             | `boolean`                     | `opacity-50` row, `EyeOff` icon         |
| `notes`                                                | `string \| null`              | curator note                            |
| `noteIsSpoiler`                                        | `boolean`                     | spoiler reveal control                  |
| `tags`                                                 | `{ id; label }[]`             | tag chips under the note slot           |
| `voteSummary` / `commentCount` / `unreadCommentCount`  | —                             | badge cluster                           |
| `addedBy`                                              | `{ name; avatarUrl } \| null` | attribution line                        |
| `mediaItem.title/year/type/poster/productionCountries` | —                             | poster + title block                    |
| `mediaItem.overview`                                   | `string \| null`              | **new consumer**: plot-summary fallback |

`mediaItem.overview` already flows from `MediaItem.overview` (TMDB) through `page.tsx` into every
`GridItem`; the list view simply starts reading it.

## Derived render values (component-local, per row)

| Name       | Derivation                                                          | Notes                                                                    |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `note`     | `item.notes?.trim() ? item.notes : null`                            | whitespace-only note → `null`; original (untrimmed) text is what renders |
| `overview` | `!note && item.mediaItem.overview?.trim() ? overview.trim() : null` | only computed when there is no note                                      |
| `showRank` | `rankingEnabled && item.displayRank !== undefined`                  | unchanged predicate, new position                                        |
| `hasSlot`  | `note !== null \|\| overview !== null \|\| item.tags.length > 0`    | whether the note/tags wrapper renders                                    |

## Note-slot state machine

The slot has exactly one of four states, resolved in this order:

```
note && noteIsSpoiler   → SPOILER   (SpoilerNote: "Spoiler — reveal" button → revealed markdown, line-clamp-2)
note                    → NOTE      (MarkdownContent inside line-clamp-3)            — unchanged
overview                → OVERVIEW  (hidden sm:block, text-xs muted, max-h-12, bottom mask fade)   — NEW
otherwise               → EMPTY     (nothing rendered)
```

Tags, when present, render after the slot content in every state (including EMPTY). The SPOILER
state's `revealed` flag is local `useState` in `SpoilerNote`, unchanged.

## Breakpoint matrix

| Viewport        | Poster            | Title block       | Note slot                                                                | Badge cluster + rank                                   |
| --------------- | ----------------- | ----------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `< sm` (~390px) | first, flush left | full width, wraps | NOTE / SPOILER / tags stacked under title; OVERVIEW **not rendered**     | column at row end: badges top-right, rank bottom-right |
| `≥ sm` (640px+) | first, flush left | `sm:w-44` fixed   | side-by-side column (`sm:flex-1`): NOTE / SPOILER / OVERVIEW, tags below | same column; identical placement                       |

## Invariants (map to requirements)

- Poster is the first flex child of the row; no element precedes it (FR-001).
- Rank element keeps `text-sm font-bold text-muted-foreground tabular-nums` (FR-003; `lists-ranked.spec.ts`).
- Rank is in normal flow inside the trailing column → cannot overlap badges or content (FR-003).
- Rank renders iff `showRank`, regardless of whether the badge row is empty (FR-002, FR-004).
- Row root still carries `opacity-50` when hidden; rank inherits it (FR-005; `lists-curation.spec.ts`).
- OVERVIEW only when `note === null` and trimmed overview is non-empty (FR-006, FR-011, FR-012).
- OVERVIEW block is `hidden` below `sm` and its wrapper adds no margin on phones (FR-007, SC-004).
- OVERVIEW height ≤ 48px, fades via `mask-image`, no ellipsis (FR-008, FR-009, FR-014).
- Row padding `p-3`, radius `rounded-lg`, poster `w-16 h-24` unchanged (FR-014).
