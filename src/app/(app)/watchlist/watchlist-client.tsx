"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  };
};

type TypeFilter = "all" | "movie" | "tv";

const SORT_LABELS: Record<string, string> = {
  added_desc: "Added (newest)",
  title_asc: "Title (A–Z)",
  year_desc: "Year (newest)",
  year_asc: "Year (oldest)",
  rating_desc: "Rating",
};

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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

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
      return true;
    });
  }, [items, typeFilter, selectedGenres]);

  const hasActiveFilters = typeFilter !== "all" || selectedGenres.length > 0;
  const isFiltered = filteredItems.length !== items.length;

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "added_desc") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function toggleGenre(genre: string, checked: boolean) {
    setSelectedGenres((prev) =>
      checked ? [...prev, genre] : prev.filter((g) => g !== genre),
    );
  }

  function clearFilters() {
    setTypeFilter("all");
    setSelectedGenres([]);
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
              onClick={() => setTypeFilter(t)}
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
                  onCheckedChange={(checked) => toggleGenre(genre, checked)}
                >
                  {genre}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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
        <p className="text-sm text-muted-foreground py-12 text-center">
          No titles match the current filters.
        </p>
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
