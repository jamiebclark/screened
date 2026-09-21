# UI Contract: List-mode row (`ListRow`)

**Component**: `src/app/(public)/lists/[slug]/list-items-list-view.tsx`
**Consumers**: `page.tsx` (when `list.displayMode === "LIST"`); `e2e/lists-ranked.spec.ts`,
`e2e/lists-curation.spec.ts` (DOM hooks listed below)

This feature changes no HTTP endpoint and no TypeScript props. The contract is the row's DOM
structure and the class hooks other code relies on.

## Props (unchanged)

```ts
interface ListItemsListViewProps {
  items: GridItem[];
  listSlug: string;
  canVote: boolean;
  rankingEnabled: boolean;
  canReorder: boolean;
  canCurate: boolean;
  onSelect: (id: string) => void;
  onHiddenChange: (id: string, isHidden: boolean) => void;
}
```

## Row structure — after

```
div.row  "flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" [+ "opacity-50" when hidden]
├── div.poster   "shrink-0 w-16 h-24 rounded overflow-hidden bg-muted"           ← FIRST child (rank column removed)
├── div.content  "flex-1 min-w-0 sm:flex sm:items-start sm:gap-3"
│   ├── div.title-block  "min-w-0 sm:w-44 sm:shrink-0"
│   │   ├── p.title      "text-sm font-medium leading-tight line-clamp-2"       ← depth unchanged (row > content > title-block > p)
│   │   ├── p.meta       "text-xs text-muted-foreground mt-0.5"
│   │   └── div.added-by (optional)
│   └── div.slot  (rendered iff note || overview || tags.length > 0)
│         classes: note||tags → "min-w-0 mt-2 sm:mt-0 sm:flex-1"
│                  overview-only → "min-w-0 hidden sm:block sm:flex-1"
│       ├── one of:
│       │   • SpoilerNote                              (note && noteIsSpoiler)   — unchanged
│       │   • div "line-clamp-3" > MarkdownContent     (note)                    — unchanged
│       │   • p.overview "hidden sm:block text-xs text-muted-foreground max-h-12 overflow-hidden mask-b-from-8 mask-b-to-12"   — NEW
│       └── div.tags "flex flex-wrap items-center gap-1 mt-1" (optional)        — unchanged
└── div.trailing "flex flex-col items-end justify-between self-stretch shrink-0 gap-1.5"   — CHANGED (was a single row)
    ├── div.badges "flex items-center gap-2"
    │   ├── ListItemVotePill  (canVote || up>0 || down>0)
    │   ├── comment badge     (commentCount > 0)
    │   ├── EyeOff            (isHidden)
    │   └── ListItemHideToggle (canCurate)  aria-label "Hide item" / "Unhide item"
    └── span.rank "text-sm font-bold text-muted-foreground tabular-nums leading-none"   (rankingEnabled && displayRank !== undefined)
```

## Stable DOM hooks (must be preserved)

| Hook                                                          | Who relies on it                                   |
| ------------------------------------------------------------- | -------------------------------------------------- |
| `[class*="tabular-nums"]` on rank                             | `lists-ranked.spec.ts` "displays position numbers" |
| `opacity-50` on the row root                                  | `lists-curation.spec.ts` hidden-for-everyone check |
| `aria-label="Hide item"/"Unhide item"`                        | `lists-curation.spec.ts`                           |
| Title `<p>` nesting depth from row                            | `lists-curation.spec.ts` (`text=… / .. / ..` walk) |
| `e.stopPropagation()` on vote pill wrapper and spoiler button | row `onClick` → `onSelect`                         |

## Behavioural guarantees

| Scenario                             | Expected                                                  |
| ------------------------------------ | --------------------------------------------------------- |
| ranking on, any width                | rank at bottom-right, below badges, no overlap            |
| ranking on, empty badge row          | rank still rendered at bottom-right                       |
| ranking off                          | no rank element anywhere                                  |
| hidden item                          | row `opacity-50`; rank inherits fade                      |
| note present (plain)                 | `line-clamp-3` markdown, no overview                      |
| note present (spoiler, not revealed) | "Spoiler — reveal" button, no overview                    |
| no note, overview present, ≥ `sm`    | faded overview ≤ 48px tall, muted `text-xs`, tags below   |
| no note, overview present, < `sm`    | nothing in slot; wrapper hidden → no extra height         |
| no note, no overview                 | slot empty (tags only if present)                         |
| whitespace-only note or overview     | treated as absent                                         |
| any width                            | `document.documentElement.scrollWidth === viewport width` |
