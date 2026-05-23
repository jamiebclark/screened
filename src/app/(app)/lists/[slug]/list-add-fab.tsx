"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Plus, Search, Loader2, Film, Tv, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SearchResult = {
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  type: string;
};

function itemKey(tmdbId: number, type: string): string {
  return `${type}-${tmdbId}`;
}

interface ListAddFabProps {
  listSlug: string;
  existingKeys: string[];
}

export function ListAddFab({ listSlug, existingKeys }: ListAddFabProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localAdded, setLocalAdded] = useState<Set<string>>(new Set());

  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [notes, setNotes] = useState("");
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
    setResults([]);
    setSearchError(null);
    setDropdownOpen(false);
    setSelected(null);
    setNotes("");
    setAddError(null);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) resetModal();
  };

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&type=multi`,
      );
      if (!res.ok) {
        setSearchError("Search failed");
        setResults([]);
        return;
      }
      const data = (await res.json()) as { results?: SearchResult[] };
      setResults(data.results ?? []);
      setDropdownOpen(true);
    } catch {
      setSearchError("Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Add item to list"
      >
        <Plus className="h-6 w-6" />
      </button>

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

              {searchError && (
                <p className="text-sm text-destructive">{searchError}</p>
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
            </div>
          ) : (
            <div className="px-5 pb-5 pt-3 space-y-4">
              {/* Selected item preview */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
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
              <div className="space-y-1.5">
                <Label htmlFor="add-notes" className="text-sm">
                  Note{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="add-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why are you adding this? Any thoughts…"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}

              <Button onClick={handleAdd} disabled={adding} className="w-full">
                {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                Add to list
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
