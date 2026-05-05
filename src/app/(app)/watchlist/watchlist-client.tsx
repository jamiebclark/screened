"use client";

import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MediaCard } from "@/components/media-card";
import { ClearTrackingCornerButton } from "@/components/clear-tracking-corner-button";

export type WatchlistItem = {
  id: string;
  status: "WATCHLIST";
  mediaItem: {
    tmdbId: number;
    type: "MOVIE" | "TV";
    title: string;
    poster: string | null;
    year: number | null;
    genres: string[];
    runtime: number | null;
  };
};

type TypeFilter = "all" | "movie" | "tv";

const SORT_LABELS: Record<string, string> = {
  added_desc: "Added (newest)",
  title_asc: "Title (A–Z)",
  year_desc: "Year (newest)",
  year_asc: "Year (oldest)",
  rating_desc: "Rating",
  runtime_asc: "Runtime (shortest)",
  runtime_desc: "Runtime (longest)",
};

const RUNTIME_OPTIONS = [
  { label: "Up to 1 hr", value: 60 },
  { label: "Up to 90 min", value: 90 },
  { label: "Up to 2 hrs", value: 120 },
  { label: "Up to 2.5 hrs", value: 150 },
  { label: "Up to 3 hrs", value: 180 },
];

function parseIntParam(value: string | null): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

export function WatchlistClient({
  items,
  availableGenres,
  sort,
}: {
  items: WatchlistItem[];
  availableGenres: string[];
  sort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Derive filter state from URL (single source of truth)
  const typeFilter = (searchParams.get("type") as TypeFilter) ?? "all";
  const genresParam = searchParams.get("genres");
  const selectedGenres = useMemo(
    () => genresParam?.split(",").filter(Boolean) ?? [],
    [genresParam],
  );
  const maxRuntime = parseIntParam(searchParams.get("maxRuntime"));
  const yearFrom = parseIntParam(searchParams.get("yearFrom"));
  const yearTo = parseIntParam(searchParams.get("yearTo"));

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter === "movie" && item.mediaItem.type !== "MOVIE")
        return false;
      if (typeFilter === "tv" && item.mediaItem.type !== "TV") return false;
      if (
        selectedGenres.length > 0 &&
        !selectedGenres.some((g) => item.mediaItem.genres.includes(g))
      )
        return false;
      if (
        maxRuntime !== null &&
        (item.mediaItem.runtime === null || item.mediaItem.runtime > maxRuntime)
      )
        return false;
      if (
        yearFrom !== null &&
        (item.mediaItem.year === null || item.mediaItem.year < yearFrom)
      )
        return false;
      if (
        yearTo !== null &&
        (item.mediaItem.year === null || item.mediaItem.year > yearTo)
      )
        return false;
      return true;
    });
  }, [items, typeFilter, selectedGenres, maxRuntime, yearFrom, yearTo]);

  const hasActiveFilters =
    typeFilter !== "all" ||
    selectedGenres.length > 0 ||
    maxRuntime !== null ||
    yearFrom !== null ||
    yearTo !== null;
  const isFiltered = filteredItems.length !== items.length;

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function handleSortChange(value: string) {
    pushParams({ sort: value === "added_desc" ? null : value });
  }

  function handleTypeChange(value: TypeFilter) {
    pushParams({ type: value === "all" ? null : value });
  }

  function handleGenreToggle(genre: string, checked: boolean) {
    const next = checked
      ? [...selectedGenres, genre]
      : selectedGenres.filter((g) => g !== genre);
    pushParams({ genres: next.length > 0 ? next.join(",") : null });
  }

  function handleRuntimeChange(value: string) {
    pushParams({ maxRuntime: value === "any" ? null : value });
  }

  function handleYearFromBlur(e: React.FocusEvent<HTMLInputElement>) {
    pushParams({ yearFrom: e.target.value || null });
  }

  function handleYearToBlur(e: React.FocusEvent<HTMLInputElement>) {
    pushParams({ yearTo: e.target.value || null });
  }

  function clearFilters() {
    pushParams({
      type: null,
      genres: null,
      maxRuntime: null,
      yearFrom: null,
      yearTo: null,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-md border border-input overflow-hidden text-sm">
          {(["all", "movie", "tv"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={cn(
                "px-3 py-1.5 font-medium transition-colors",
                typeFilter === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t === "all" ? "All" : t === "movie" ? "Movies" : "TV"}
            </button>
          ))}
        </div>

        {availableGenres.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-sm">
                {selectedGenres.length > 0
                  ? `Genre · ${selectedGenres.length}`
                  : "Genre"}
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 overflow-y-auto"
            >
              {availableGenres.map((genre) => (
                <DropdownMenuCheckboxItem
                  key={genre}
                  checked={selectedGenres.includes(genre)}
                  onCheckedChange={(checked) =>
                    handleGenreToggle(genre, checked)
                  }
                >
                  {genre}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Select
          value={maxRuntime !== null ? String(maxRuntime) : "any"}
          onValueChange={handleRuntimeChange}
        >
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Any length" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any length</SelectItem>
            {RUNTIME_OPTIONS.map(({ label, value }) => (
              <SelectItem key={value} value={String(value)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* key resets uncontrolled inputs when URL params are cleared */}
        <div
          key={`years-${yearFrom ?? ""}-${yearTo ?? ""}`}
          className="flex items-center gap-1"
        >
          <Input
            type="number"
            placeholder="Year from"
            className="h-8 w-24 text-sm"
            defaultValue={yearFrom ?? ""}
            onBlur={handleYearFromBlur}
          />
          <span className="text-sm text-muted-foreground">–</span>
          <Input
            type="number"
            placeholder="To"
            className="h-8 w-20 text-sm"
            defaultValue={yearTo ?? ""}
            onBlur={handleYearToBlur}
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-sm"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        {isFiltered && (
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredItems.length} of {items.length}
          </span>
        )}
      </div>

      {/* Grid */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No titles match the current filters.
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {filteredItems.map((item) => {
            const type = item.mediaItem.type === "MOVIE" ? "movie" : "tv";
            return (
              <div key={item.id} className="relative">
                <ClearTrackingCornerButton
                  tmdbId={item.mediaItem.tmdbId}
                  type={type}
                  position="top-left"
                  title="Remove from watchlist"
                  ariaLabel="Remove from watchlist"
                />
                <MediaCard
                  tmdbId={item.mediaItem.tmdbId}
                  type={type}
                  title={item.mediaItem.title}
                  poster={item.mediaItem.poster}
                  year={item.mediaItem.year}
                  status={item.status}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
