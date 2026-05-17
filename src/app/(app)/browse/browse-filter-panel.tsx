"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TmdbGenre } from "@/lib/tmdb";
import {
  type BrowseFilter,
  type BrowseSortOrder,
  serializeBrowseFilter,
  isFilterActive,
} from "@/lib/browse-types";
import { getDefaultSort } from "@/lib/browse-utils";
import { PersonTagInput } from "./person-tag-input";

interface BrowseFilterPanelProps {
  genres: TmdbGenre[];
  filter: BrowseFilter;
  type: string;
  filterParam: string | null;
  isLoggedIn: boolean;
  yearError?: boolean;
}

const TYPE_LABELS = { movie: "Movies", tv: "TV Shows", all: "All" } as const;

const SCOPE_LABELS = {
  seen: "Seen",
  unseen: "Not Seen",
  library: "In My Library",
  friends: "Friends' Library",
} as const;

const SORT_LABELS: Record<BrowseSortOrder, string> = {
  popularity: "Popularity",
  title: "Title A–Z",
  year_desc: "Year: Newest First",
  year_asc: "Year: Oldest First",
  rating_desc: "Rating: High to Low",
  rating_asc: "Rating: Low to High",
};

export function BrowseFilterPanel({
  genres,
  filter,
  type,
  filterParam,
  isLoggedIn,
  yearError,
}: BrowseFilterPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Local year input state so typing doesn't immediately trigger navigation
  const [yearMinInput, setYearMinInput] = useState(
    filter.yearMin !== null ? String(filter.yearMin) : "",
  );
  const [yearMaxInput, setYearMaxInput] = useState(
    filter.yearMax !== null ? String(filter.yearMax) : "",
  );

  const isAll = type === "all";
  const hasActiveFilter = isFilterActive(filter);
  const effectiveSort = filter.sortOrder ?? getDefaultSort(filterParam);

  function navigate(
    newFilter: BrowseFilter,
    newType?: string,
    newScope?: string | null,
  ) {
    const t = newType ?? type;
    const s = newScope !== undefined ? newScope : filterParam;
    router.push(
      serializeBrowseFilter(newFilter, {
        type: t,
        filter: s ?? undefined,
      }),
    );
  }

  function setGenreIds(ids: number[]) {
    navigate({ ...filter, genreIds: ids });
  }

  function toggleGenre(id: number) {
    const next = filter.genreIds.includes(id)
      ? filter.genreIds.filter((g) => g !== id)
      : [...filter.genreIds, id];
    setGenreIds(next);
  }

  function setSort(sort: BrowseSortOrder) {
    navigate({ ...filter, sortOrder: sort });
  }

  function commitYearRange() {
    const min = parseInt(yearMinInput, 10);
    const max = parseInt(yearMaxInput, 10);
    const yearMin =
      Number.isFinite(min) && min >= 1800 && min <= 2099 ? min : null;
    const yearMax =
      Number.isFinite(max) && max >= 1800 && max <= 2099 ? max : null;
    navigate({ ...filter, yearMin, yearMax });
  }

  function clearFilters() {
    setYearMinInput("");
    setYearMaxInput("");
    navigate({
      genreIds: [],
      sortOrder: null,
      yearMin: null,
      yearMax: null,
      includePersons: [],
      excludePersons: [],
    });
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Always-visible row: type tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["movie", "tv", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() =>
              navigate(filter, t, t === "all" ? null : filterParam)
            }
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              type === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Always-visible: scope (user filter) buttons + expand toggle */}
      {!isAll && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {isLoggedIn &&
              (Object.keys(SCOPE_LABELS) as (keyof typeof SCOPE_LABELS)[]).map(
                (f) => (
                  <button
                    key={f}
                    onClick={() =>
                      navigate(filter, undefined, filterParam === f ? null : f)
                    }
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      filterParam === f
                        ? "bg-secondary text-secondary-foreground ring-1 ring-ring"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {SCOPE_LABELS[f]}
                  </button>
                ),
              )}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Clear filters
              </button>
            )}
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm hover:bg-accent transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM9 15a1 1 0 011-1h6a1 1 0 110 2h-6a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Filters
              {hasActiveFilter && (
                <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium w-4 h-4 flex items-center justify-center">
                  !
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Collapsible filter panel */}
      {!isAll && open && (
        <div className="rounded-lg border bg-card p-4 space-y-5">
          {/* Sort */}
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold">Sort by</h3>
            <select
              value={effectiveSort}
              onChange={(e) => setSort(e.target.value as BrowseSortOrder)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {(Object.keys(SORT_LABELS) as BrowseSortOrder[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Genre pills */}
          {genres.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold">Genres</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setGenreIds([])}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    filter.genreIds.length === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  All
                </button>
                {genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      filter.genreIds.includes(g.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Year range */}
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold">Release year</h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1800}
                max={2099}
                value={yearMinInput}
                onChange={(e) => setYearMinInput(e.target.value)}
                onBlur={commitYearRange}
                placeholder="From"
                className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">–</span>
              <input
                type="number"
                min={1800}
                max={2099}
                value={yearMaxInput}
                onChange={(e) => setYearMaxInput(e.target.value)}
                onBlur={commitYearRange}
                placeholder="To"
                className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {yearError && (
              <p className="text-sm text-destructive">
                &ldquo;From&rdquo; year must be less than or equal to
                &ldquo;To&rdquo; year.
              </p>
            )}
          </div>

          {/* Person filters */}
          <div className="grid gap-4 sm:grid-cols-2">
            <PersonTagInput
              label="Include person"
              persons={filter.includePersons}
              maxCount={5}
              onChange={(persons) =>
                navigate({ ...filter, includePersons: persons })
              }
            />
            <PersonTagInput
              label="Exclude person"
              persons={filter.excludePersons}
              maxCount={5}
              onChange={(persons) =>
                navigate({ ...filter, excludePersons: persons })
              }
            />
          </div>
        </div>
      )}

      {/* Active genre pills outside panel (quick-access chips when panel is closed) */}
      {!isAll && !open && filter.genreIds.length > 0 && genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filter.genreIds.map((id) => {
            const name = genres.find((g) => g.id === id)?.name;
            if (!name) return null;
            return (
              <button
                key={id}
                onClick={() => toggleGenre(id)}
                className="rounded-full px-3 py-1 text-sm bg-primary text-primary-foreground transition-colors"
              >
                {name} ×
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
