"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Search, Loader2, Film, Tv, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MarkdownEditor } from "@/components/markdown-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  buildTitleSearchQuery,
  TitleMediaType,
} from "@/lib/title-search-params";

type SearchResult = {
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  type: string;
};

const SEARCH_LIMIT = 20;

function itemKey(tmdbId: number, type: string): string {
  return `${type}-${tmdbId}`;
}

interface ListAddFabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listSlug: string;
  existingKeys: string[];
}

export function ListAddFab({
  open,
  onOpenChange,
  listSlug,
  existingKeys,
}: ListAddFabProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState<TitleMediaType>("multi");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localAdded, setLocalAdded] = useState<Set<string>>(new Set());
  const requestSeqRef = useRef(0);

  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [notes, setNotes] = useState("");
  const [noteIsSpoiler, setNoteIsSpoiler] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const existing = useMemo(
    () => new Set([...existingKeys, ...localAdded]),
    [existingKeys, localAdded],
  );

  const resetModal = () => {
    setQuery("");
    setMediaType("multi");
    setYear("");
    setPage(1);
    setTotalPages(0);
    setResults([]);
    setSearchError(null);
    setDropdownOpen(false);
    setSelected(null);
    setNotes("");
    setNoteIsSpoiler(false);
    setAddError(null);
  };

  const handleOpenChange = (val: boolean) => {
    onOpenChange(val);
    if (!val) resetModal();
  };

  const search = useCallback(
    async (
      q: string,
      type: TitleMediaType,
      yearInput: string,
      pageNum: number,
      append: boolean,
    ) => {
      if (!q.trim()) {
        setResults([]);
        setTotalPages(0);
        setDropdownOpen(false);
        return;
      }
      const seq = ++requestSeqRef.current;
      if (append) setLoadingMore(true);
      else setSearching(true);
      setSearchError(null);
      try {
        const yearNum = yearInput.trim() ? Number(yearInput) : undefined;
        const qs = buildTitleSearchQuery({
          q,
          mediaType: type,
          year: yearNum,
          page: pageNum,
          limit: SEARCH_LIMIT,
        });
        const res = await fetch(`/api/search?${qs}`);
        if (seq !== requestSeqRef.current) return;
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setSearchError(j.error ?? "Search failed");
          if (!append) setResults([]);
          return;
        }
        const data = (await res.json()) as {
          results?: SearchResult[];
          totalPages?: number;
        };
        setResults((prev) =>
          append ? [...prev, ...(data.results ?? [])] : (data.results ?? []),
        );
        setTotalPages(data.totalPages ?? 0);
        setDropdownOpen(true);
      } catch {
        if (seq !== requestSeqRef.current) return;
        setSearchError("Search failed");
        if (!append) setResults([]);
      } finally {
        if (seq === requestSeqRef.current) {
          setSearching(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => search(val, mediaType, year, 1, false),
      350,
    );
  };

  const handleMediaTypeChange = (type: TitleMediaType) => {
    setMediaType(type);
    setPage(1);
    search(query, type, year, 1, false);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYear(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => search(query, mediaType, val, 1, false),
      350,
    );
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    search(query, mediaType, year, nextPage, true);
  };

  const handleClearFilters = () => {
    setMediaType("multi");
    setYear("");
    setPage(1);
    search(query, "multi", "", 1, false);
  };

  const handleSelect = (result: SearchResult) => {
    const t = result.type === "tv" ? "tv" : "movie";
    if (existing.has(itemKey(result.tmdbId, t))) return;
    setSelected({ ...result, type: t });
    setDropdownOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleBack = () => {
    setSelected(null);
    setNotes("");
    setNoteIsSpoiler(false);
    setAddError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/lists/${listSlug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: selected.tmdbId,
          type: selected.type,
          notes: notes.trim() || undefined,
          noteIsSpoiler: notes.trim() ? noteIsSpoiler : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setAddError(j.error ?? "Could not add to list");
        return;
      }
      setLocalAdded(
        (prev) => new Set([...prev, itemKey(selected.tmdbId, selected.type)]),
      );
      router.refresh();
      handleOpenChange(false);
    } catch {
      setAddError("Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  useEffect(() => {
    if (open && !selected) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, selected]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle>
            {selected ? "Add to list" : "Search to add"}
          </DialogTitle>
        </DialogHeader>

        {!selected ? (
          <div className="px-5 pb-5 pt-3 space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                onFocus={() => results.length > 0 && setDropdownOpen(true)}
                placeholder="Search movies and TV shows…"
                className="pl-9 pr-9"
                autoComplete="off"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Filters: media type + year */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-border p-0.5">
                {(
                  [
                    { value: "multi", label: "All" },
                    { value: "movie", label: "Films" },
                    { value: "tv", label: "TV" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleMediaTypeChange(opt.value)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-sm transition-colors",
                      mediaType === opt.value
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Input
                value={year}
                onChange={handleYearChange}
                placeholder="Year"
                inputMode="numeric"
                className="w-20 h-8 text-xs"
              />
            </div>

            {searchError && (
              <p className="text-sm text-destructive">{searchError}</p>
            )}

            {/* Empty state */}
            {dropdownOpen &&
              !searching &&
              query.trim() &&
              results.length === 0 &&
              !searchError && (
                <div className="rounded-md border border-border p-3 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No titles matched. Try a different year, or search both
                    films and TV.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </Button>
                </div>
              )}

            {/* Results */}
            {dropdownOpen && results.length > 0 && (
              <ul className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {results.map((r) => {
                  const t = r.type === "tv" ? "tv" : "movie";
                  const k = itemKey(r.tmdbId, t);
                  const isOnList = existing.has(k);
                  return (
                    <li key={k}>
                      <button
                        type="button"
                        disabled={isOnList}
                        onClick={() => handleSelect(r)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                          isOnList
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-accent cursor-pointer",
                        )}
                      >
                        {r.poster ? (
                          <Image
                            src={r.poster}
                            alt=""
                            width={28}
                            height={42}
                            className="rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            {t === "tv" ? (
                              <Tv className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Film className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{r.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {r.year != null && <span>{r.year}</span>}
                            <span className="inline-flex items-center gap-0.5">
                              {t === "tv" ? (
                                <Tv className="h-3 w-3" />
                              ) : (
                                <Film className="h-3 w-3" />
                              )}
                              {t === "tv" ? "TV" : "Movie"}
                            </span>
                          </div>
                        </div>
                        {isOnList && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            Added
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {dropdownOpen && results.length > 0 && page < totalPages && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={loadingMore}
                onClick={handleLoadMore}
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more
              </Button>
            )}
          </div>
        ) : (
          <div className="px-5 pb-5 pt-3 space-y-4 min-w-0">
            {/* Selected item preview */}
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 overflow-hidden">
              {selected.poster ? (
                <Image
                  src={selected.poster}
                  alt=""
                  width={40}
                  height={60}
                  className="rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-15 rounded bg-muted shrink-0 flex items-center justify-center">
                  {selected.type === "tv" ? (
                    <Tv className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Film className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{selected.title}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.year != null && `${selected.year} · `}
                  {selected.type === "tv" ? "TV Show" : "Movie"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change
              </button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">
                Note{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <MarkdownEditor
                value={notes}
                onChange={setNotes}
                placeholder="Why are you adding this? Any thoughts…"
                height={160}
              />
              {notes.trim() && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    id="add-spoiler"
                    checked={noteIsSpoiler}
                    onCheckedChange={(v) => setNoteIsSpoiler(v === true)}
                  />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Mark note as spoiler
                  </span>
                </label>
              )}
            </div>

            {addError && <p className="text-sm text-destructive">{addError}</p>}

            <Button onClick={handleAdd} disabled={adding} className="w-full">
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              Add to list
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
