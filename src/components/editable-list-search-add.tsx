"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, Loader2, Film, Tv, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
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

type EditableListSearchAddProps =
  | { variant: "list"; listSlug: string; existingKeys: string[] }
  | { variant: "watchlist"; existingKeys: string[] }
  | { variant: "watching"; existingKeys: string[] }
  | { variant: "dropped"; existingKeys: string[] };

const PLACEHOLDERS: Record<EditableListSearchAddProps["variant"], string> = {
  list: "Search movies and TV to add to this list…",
  watchlist: "Search to add to your watchlist…",
  watching: "Search to add to in progress…",
  dropped: "Search to add as dropped…",
};

export function EditableListSearchAdd(props: EditableListSearchAddProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [localAdded, setLocalAdded] = useState<Set<string>>(() => new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(() => {
    return new Set([...props.existingKeys, ...localAdded]);
  }, [props.existingKeys, localAdded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=multi`);
      if (!res.ok) {
        setError("Search failed");
        setResults([]);
        return;
      }
      const data = (await res.json()) as { results?: SearchResult[] };
      setResults(data.results ?? []);
      setOpen(true);
    } catch {
      setError("Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const addItem = async (result: SearchResult) => {
    const t = result.type === "tv" ? "tv" : "movie";
    const k = itemKey(result.tmdbId, t);
    if (existing.has(k) || adding) return;

    setAdding(k);
    setError(null);
    try {
      if (props.variant === "list") {
        const res = await fetch(`/api/lists/${props.listSlug}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: result.tmdbId, type: t }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? "Could not add to list");
          return;
        }
      } else {
        const status =
          props.variant === "watchlist"
            ? "WATCHLIST"
            : props.variant === "watching"
              ? "WATCHING"
              : "DROPPED";
        const res = await fetch("/api/media/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: result.tmdbId, type: t, status }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? "Could not update");
          return;
        }
      }
      setLocalAdded((prev) => new Set([...prev, k]));
      setQuery("");
      setResults([]);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-6">
      <p className="text-sm font-medium mb-3">Search and add</p>
      <div ref={containerRef} className="relative max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder={PLACEHOLDERS[props.variant]}
            className="pl-9 pr-9"
            autoComplete="off"
          />
          {(loading || adding !== null) && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {open && results.length > 0 && (
          <ul
            className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg"
            role="listbox"
          >
            {results.map((r) => {
              const t = r.type === "tv" ? "tv" : "movie";
              const k = itemKey(r.tmdbId, t);
              const isOnList = existing.has(k);
              const isAdding = adding === k;
              return (
                <li key={`${k}`}>
                  <button
                    type="button"
                    disabled={isOnList || isAdding}
                    onClick={() => addItem(r)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                      isOnList
                        ? "cursor-not-allowed opacity-50"
                        : "hover:bg-accent cursor-pointer"
                    )}
                  >
                    {r.poster ? (
                      <Image
                        src={r.poster}
                        alt=""
                        width={32}
                        height={48}
                        className="rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
                        {t === "tv" ? (
                          <Tv className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Film className="h-4 w-4 text-muted-foreground" />
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
                    {isOnList ? (
                      <span className="text-xs text-muted-foreground shrink-0">Added</span>
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
