"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  X,
  Plus,
  Loader2,
  Film,
  BookmarkCheck,
  User,
  Tag,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { filterTmdbMovieGenres } from "@/lib/tmdb-movie-genres";
import {
  type PickerRoomState,
  type ReferenceMovieJson,
} from "@/lib/picker-room-state";

// ─── Shared constants / helpers ───────────────────────────────────────────────

export const WEIGHTS = [
  { label: "Soft", value: 0.5, title: "Mild influence on recommendations" },
  {
    label: "Normal",
    value: 1.0,
    title: "Standard influence on recommendations",
  },
  { label: "Strong", value: 2.0, title: "Heavy influence on recommendations" },
];

export function parseOptionalYear(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function applyFilterListChange(
  p: PickerRoomState,
  listKey:
    | "requirePeople"
    | "excludePeople"
    | "includeGenres"
    | "excludeGenres",
  values: string[],
  actorId: string,
): PickerRoomState {
  const prevList = p[listKey];
  const prevMap: Record<string, string> = {
    ...(p.filterAttribution?.[listKey] ?? {}),
  };
  const prevSet = new Set(prevList);
  const nextSet = new Set(values);
  for (const v of prevList) {
    if (!nextSet.has(v)) delete prevMap[v];
  }
  for (const v of values) {
    if (!prevSet.has(v)) prevMap[v] = actorId;
  }
  return {
    ...p,
    [listKey]: values,
    filterAttribution: {
      ...p.filterAttribution,
      [listKey]: prevMap,
    },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserLite {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface SearchResult {
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  type: string;
}

interface SearchUser {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  plexConnection: { plexUsername: string } | null;
}

type PersonResult = {
  id: number;
  name: string;
  role: string | null;
  profile: string | null;
};

// ─── MovieSearchInput ─────────────────────────────────────────────────────────

function MovieSearchInput({
  onAdd,
  placeholder,
  existingIds,
}: {
  onAdd: (movie: ReferenceMovieJson) => void;
  placeholder: string;
  existingIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
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
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&type=movie`,
      );
      if (!res.ok) {
        toast({
          variant: "destructive",
          description: "Search failed. Please try again.",
        });
        setResults([]);
        return;
      }
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results ?? []);
      setOpen(true);
    } catch {
      toast({
        variant: "destructive",
        description: "Search failed. Please try again.",
      });
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

  const handleSelect = async (result: SearchResult) => {
    setAdding(result.tmdbId);
    setOpen(false);
    setQuery("");
    setResults([]);
    try {
      const res = await fetch("/api/media/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: result.tmdbId, type: result.type }),
      });
      const data = (await res.json()) as {
        id: string;
        tmdbId: number;
        title: string;
        poster: string | null;
        year: number | null;
        hasEmbedding: boolean;
        genres?: string[];
      };
      if (res.ok) {
        onAdd({
          mediaItemId: data.id,
          tmdbId: data.tmdbId,
          title: data.title,
          poster: data.poster,
          year: data.year,
          weight: 1.0,
          saved: false,
          hasEmbedding: data.hasEmbedding,
          genres: data.genres ?? [],
        });
      } else {
        toast({
          variant: "destructive",
          description: `Could not add "${result.title}". Please try again.`,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        description: `Could not add "${result.title}". Please try again.`,
      });
    } finally {
      setAdding(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {(loading || adding !== null) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          {results.map((r) => {
            const alreadyAdded = existingIds.has(String(r.tmdbId));
            return (
              <button
                key={r.tmdbId}
                disabled={alreadyAdded || adding === r.tmdbId}
                onClick={() => handleSelect(r)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                  alreadyAdded
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-accent cursor-pointer",
                )}
              >
                {r.poster ? (
                  <Image
                    src={r.poster}
                    alt={r.title}
                    width={32}
                    height={48}
                    className="rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
                    <Film className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  {r.year && (
                    <p className="text-xs text-muted-foreground">{r.year}</p>
                  )}
                </div>
                {alreadyAdded && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    Added
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ReferenceMovieCard ───────────────────────────────────────────────────────

function ReferenceMovieCard({
  movie,
  onRemove,
  onWeightChange,
  onSaveToggle,
  addedByLabel,
}: {
  movie: ReferenceMovieJson;
  onRemove: () => void;
  onWeightChange: (weight: number) => void;
  onSaveToggle: () => void;
  addedByLabel?: string | null;
}) {
  const [saving, setSaving] = useState(false);

  const handleSaveToggle = async () => {
    setSaving(true);
    await onSaveToggle();
    setSaving(false);
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      {movie.poster ? (
        <Image
          src={`https://image.tmdb.org/t/p/w92${movie.poster}`}
          alt={movie.title}
          width={40}
          height={60}
          className="rounded object-cover shrink-0"
        />
      ) : (
        <div className="w-10 h-14 rounded bg-muted shrink-0 flex items-center justify-center">
          <Film className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{movie.title}</p>
            {movie.year && (
              <p className="text-xs text-muted-foreground">{movie.year}</p>
            )}
            {!movie.hasEmbedding && (
              <p className="text-xs text-amber-500 mt-0.5">
                No embedding — add OPENAI_API_KEY
              </p>
            )}
            {addedByLabel ? (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {addedByLabel}
              </p>
            ) : null}
          </div>
          <button
            onClick={onRemove}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 mt-2">
          {WEIGHTS.map((w) => (
            <button
              key={w.value}
              onClick={() => onWeightChange(w.value)}
              title={w.title}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors border",
                movie.weight === w.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSaveToggle}
          disabled={saving}
          className={cn(
            "mt-2 flex items-center gap-1 text-xs transition-colors",
            movie.saved
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <BookmarkCheck className="h-3 w-3" />
          )}
          {movie.saved ? "Saved to profile" : "Save as my preference"}
        </button>
      </div>
    </div>
  );
}

// ─── ParticipantSearch ────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ParticipantSearch({
  participants,
  currentUserId,
  onAdd,
  onRemove,
}: {
  participants: UserLite[];
  currentUserId: string;
  onAdd: (user: UserLite) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);
  const participantIds = new Set(participants.map((p) => p.id));
  const [, startUserSearchTransition] = useTransition();

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      startUserSearchTransition(() => {
        setResults([]);
        setOpen(false);
      });
      return;
    }
    startUserSearchTransition(() => {
      setSearching(true);
    });
    fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json() as Promise<SearchUser[]>)
      .then((data) => {
        setResults(data);
        setOpen(data.length > 0);
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, startUserSearchTransition]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (user: SearchUser) => {
    if (!participantIds.has(user.id)) {
      onAdd({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      });
    }
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const initials = (name: string | null, email: string | null) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : (email?.[0]?.toUpperCase() ?? "U");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {participants.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          return (
            <div
              key={user.id}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                isCurrentUser
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-muted/40",
              )}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {initials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <span>{user.name ?? user.email}</span>
              {isCurrentUser ? (
                <span className="text-xs opacity-50">(you)</span>
              ) : (
                <button
                  onClick={() => onRemove(user.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div ref={containerRef} className="relative max-w-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Add someone..."
            className="pl-9 pr-9 h-8 text-sm"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
            {results.map((user) => {
              const alreadyAdded = participantIds.has(user.id);
              return (
                <button
                  key={user.id}
                  disabled={alreadyAdded}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(user);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                    alreadyAdded
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-accent cursor-pointer",
                  )}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {initials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {user.name ?? user.email}
                    </p>
                    {user.plexConnection?.plexUsername && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.plexConnection.plexUsername}
                      </p>
                    )}
                  </div>
                  {alreadyAdded && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">
                      Added
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PersonTagInput ───────────────────────────────────────────────────────────

function PersonTagInput({
  values,
  onChange,
  placeholder,
  colorClass,
  valueAddedBy,
  formatAddedBy,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  colorClass: string;
  valueAddedBy?: Record<string, string>;
  formatAddedBy?: (userId: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/person?q=${encodeURIComponent(q.trim())}`,
        );
        const data = (await res.json()) as { results?: PersonResult[] };
        const list = (data.results ?? []).filter(
          (p) => !values.some((v) => v.toLowerCase() === p.name.toLowerCase()),
        );
        setResults(list);
        setOpen(list.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [values],
  );

  const addName = (name: string) => {
    const t = name.trim();
    if (!t || values.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...values, t]);
  };

  const addFromInput = () => {
    if (open && results[0]) {
      addName(results[0]!.name);
    } else {
      const t = query.trim();
      if (t.length >= 2) addName(t);
    }
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const selectPerson = (p: PersonResult) => {
    addName(p.name);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const remove = (name: string) => onChange(values.filter((v) => v !== name));
  const canAdd = (open && results.length > 0) || query.trim().length >= 2;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <div className="relative flex gap-2">
          <div className="relative flex-1 min-w-0">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFromInput();
                }
              }}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-9"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFromInput}
            disabled={!canAdd}
            className="shrink-0"
            title="Add (first suggestion if open, or at least 2 characters)"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-56 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPerson(p);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                {p.profile ? (
                  <Image
                    src={p.profile}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-sm object-cover shrink-0 w-9 h-9"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-sm bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  {p.role && (
                    <p className="text-xs text-muted-foreground truncate">
                      {p.role}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((name) => {
            const by = valueAddedBy?.[name];
            const byLine = by && formatAddedBy ? formatAddedBy(by) : null;
            return (
              <span
                key={name}
                className={cn(
                  "inline-flex flex-col rounded-full px-2.5 py-1 text-xs font-medium",
                  colorClass,
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {name}
                  <button
                    type="button"
                    onClick={() => remove(name)}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
                {byLine ? (
                  <span className="text-[10px] font-normal text-muted-foreground leading-tight mt-0.5 pl-0.5">
                    {byLine}
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── GenreTagInput ────────────────────────────────────────────────────────────

function GenreTagInput({
  values,
  onChange,
  placeholder,
  colorClass,
  hint,
  valueAddedBy,
  formatAddedBy,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  colorClass: string;
  hint?: string;
  valueAddedBy?: Record<string, string>;
  formatAddedBy?: (userId: string) => string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => filterTmdbMovieGenres(query, 10), [query]);
  const availableSuggestions = useMemo(
    () =>
      suggestions.filter(
        (s: string) =>
          !values.some((v) => v.toLowerCase() === s.toLowerCase()),
      ),
    [suggestions, values],
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const addExact = (name: string) => {
    const t = name.trim();
    if (!t) return;
    if (values.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...values, t]);
    setQuery("");
    setOpen(false);
  };

  const add = () => {
    const t = query.trim();
    if (!t) return;
    if (availableSuggestions.length > 0) {
      addExact(availableSuggestions[0]!);
      return;
    }
    addExact(t);
  };

  const remove = (name: string) => onChange(values.filter((v) => v !== name));
  const canAdd = query.trim().length > 0;

  return (
    <div className="space-y-2">
      {hint && (
        <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>
      )}
      <div ref={containerRef} className="relative space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-3"
              autoComplete="off"
            />
            {open && availableSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover py-0.5 shadow-lg">
                {availableSuggestions.map((g: string) => (
                  <button
                    key={g}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addExact(g);
                    }}
                    className="flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            disabled={!canAdd}
            className="shrink-0"
            title="Add (first match, or your text)"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {values.map((name) => {
              const by = valueAddedBy?.[name];
              const byLine = by && formatAddedBy ? formatAddedBy(by) : null;
              return (
                <span
                  key={name}
                  className={cn(
                    "inline-flex flex-col rounded-full px-2.5 py-1 text-xs font-medium",
                    colorClass,
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {name}
                    <button
                      type="button"
                      onClick={() => remove(name)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                  {byLine ? (
                    <span className="text-[10px] font-normal text-muted-foreground leading-tight mt-0.5 pl-0.5">
                      {byLine}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PickerForm ───────────────────────────────────────────────────────────────

export interface PickerFormProps {
  roomState: PickerRoomState;
  currentUserId: string;
  hasPlexLinked: boolean;
  participantLabel: (userId: string) => string;
  onStateChange: Dispatch<SetStateAction<PickerRoomState>>;
  onToggleSave: (
    pool: "attractor" | "repeller",
    movie: ReferenceMovieJson,
  ) => Promise<void>;
}

export function PickerForm({
  roomState,
  currentUserId,
  hasPlexLinked,
  participantLabel,
  onStateChange,
  onToggleSave,
}: PickerFormProps) {
  const {
    attractors,
    repellers,
    participants,
    minYear,
    maxYear,
    maxRuntime,
    requirePeople,
    excludePeople,
    includeGenres,
    excludeGenres,
    plexLibraryOnly,
    hideAllLogged,
    filterAttribution = {},
    filterFieldEditors = {},
  } = roomState;

  const addedByChipLine = useCallback(
    (userId: string) => `Added by ${participantLabel(userId)}`,
    [participantLabel],
  );

  const attractorIds = new Set(attractors.map((a) => String(a.tmdbId)));
  const repellerIds = new Set(repellers.map((r) => String(r.tmdbId)));

  const aggregatedAttractorGenres = useMemo(() => {
    const s = new Set<string>();
    for (const a of attractors) {
      for (const g of a.genres) {
        if (g.trim()) s.add(g);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [attractors]);

  const plexSolo = participants.length === 1;
  const plexFilterDisabled = plexSolo && !hasPlexLinked;

  const updateWeight = (
    pool: "attractor" | "repeller",
    mediaItemId: string,
    weight: number,
  ) => {
    onStateChange((prev) => {
      if (pool === "attractor") {
        return {
          ...prev,
          attractors: prev.attractors.map((m) =>
            m.mediaItemId === mediaItemId ? { ...m, weight } : m,
          ),
        };
      }
      return {
        ...prev,
        repellers: prev.repellers.map((m) =>
          m.mediaItemId === mediaItemId ? { ...m, weight } : m,
        ),
      };
    });
  };

  const remove = (pool: "attractor" | "repeller", mediaItemId: string) => {
    onStateChange((prev) => {
      if (pool === "attractor") {
        return {
          ...prev,
          attractors: prev.attractors.filter(
            (m) => m.mediaItemId !== mediaItemId,
          ),
        };
      }
      return {
        ...prev,
        repellers: prev.repellers.filter((m) => m.mediaItemId !== mediaItemId),
        vetoIds: prev.vetoIds.filter((id) => id !== mediaItemId),
      };
    });
  };

  const isFirstVisit = attractors.length === 0 && repellers.length === 0;

  return (
    <div className="space-y-6">
      {isFirstVisit && (
        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
          <h3 className="text-base font-semibold">How it works</h3>
          <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 shrink-0 mt-1.5" />
              <div>
                <p className="font-medium text-foreground">Like these</p>
                <p>Add films that capture the mood you&apos;re after. The picker finds titles with similar vibes, themes, and style.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-2 w-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
              <div>
                <p className="font-medium text-foreground">Not like these</p>
                <p>Add films you want to steer away from. Each one pushes matching titles down the ranked list.</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Add at least one film to &quot;Like these&quot;, then click &quot;Find movies&quot; to get a ranked list of suggestions.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-base font-semibold tracking-tight">Movies</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
          {/* Like these */}
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <CardTitle className="text-base">Like these</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Films that capture the mood you&apos;re after tonight
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <MovieSearchInput
                onAdd={(movie) =>
                  onStateChange((prev) => ({
                    ...prev,
                    attractors: [
                      ...prev.attractors,
                      { ...movie, addedByUserId: currentUserId },
                    ],
                  }))
                }
                placeholder="Search for a film..."
                existingIds={new Set([...attractorIds, ...repellerIds])}
              />
              <div className="space-y-2">
                {attractors.map((m) => (
                  <ReferenceMovieCard
                    key={m.mediaItemId}
                    movie={m}
                    onRemove={() => remove("attractor", m.mediaItemId)}
                    onWeightChange={(w) =>
                      updateWeight("attractor", m.mediaItemId, w)
                    }
                    onSaveToggle={() => onToggleSave("attractor", m)}
                    addedByLabel={
                      m.addedByUserId
                        ? addedByChipLine(m.addedByUserId)
                        : null
                    }
                  />
                ))}
                {attractors.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <Plus className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Add at least one film to match against
                    </p>
                  </div>
                )}
              </div>
              {aggregatedAttractorGenres.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Genres across your &quot;Like these&quot; picks
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {aggregatedAttractorGenres.map((g) => (
                      <span
                        key={g}
                        className="rounded border border-border/70 bg-background/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    For reference only. &quot;Must include&quot; / &quot;Exclude
                    genres&quot; under Genres below apply to the ranked
                    suggestions—they are not filled in from this list, and the
                    scoring uses embeddings, not via these tags.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Not like these */}
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <CardTitle className="text-base">Not like these</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Too intense, too slow, or not tonight
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <MovieSearchInput
                onAdd={(movie) =>
                  onStateChange((prev) => ({
                    ...prev,
                    repellers: [
                      ...prev.repellers,
                      { ...movie, addedByUserId: currentUserId },
                    ],
                  }))
                }
                placeholder="Search for a film..."
                existingIds={new Set([...attractorIds, ...repellerIds])}
              />
              <div className="space-y-2">
                {repellers.map((m) => (
                  <ReferenceMovieCard
                    key={m.mediaItemId}
                    movie={m}
                    onRemove={() => remove("repeller", m.mediaItemId)}
                    onWeightChange={(w) =>
                      updateWeight("repeller", m.mediaItemId, w)
                    }
                    onSaveToggle={() => onToggleSave("repeller", m)}
                    addedByLabel={
                      m.addedByUserId
                        ? addedByChipLine(m.addedByUserId)
                        : null
                    }
                  />
                ))}
                {repellers.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <X className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Add vibes to steer away from, or use ✕ on a suggestion
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="space-y-6">
            {/* Years */}
            <section className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight">Years</h3>
              <p className="text-xs text-muted-foreground">
                Release year range (optional)
              </p>
              <div
                role="group"
                aria-label="Release year range"
                className="flex h-9 w-fit max-w-full shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring"
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="?"
                  aria-label="From year (optional)"
                  value={minYear}
                  onChange={(e) =>
                    onStateChange((p) => ({
                      ...p,
                      minYear: e.target.value,
                      filterFieldEditors: {
                        ...p.filterFieldEditors,
                        minYear: currentUserId,
                      },
                    }))
                  }
                  className="h-9 w-[3.5rem] shrink-0 border-0 bg-transparent px-1.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
                />
                <span
                  className="shrink-0 select-none text-muted-foreground"
                  aria-hidden
                >
                  –
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  placeholder="?"
                  aria-label="To year (optional)"
                  value={maxYear}
                  onChange={(e) =>
                    onStateChange((p) => ({
                      ...p,
                      maxYear: e.target.value,
                      filterFieldEditors: {
                        ...p.filterFieldEditors,
                        maxYear: currentUserId,
                      },
                    }))
                  }
                  className="h-9 w-[3.5rem] shrink-0 border-0 bg-transparent px-1.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
                />
              </div>
              {(filterFieldEditors.minYear || filterFieldEditors.maxYear) && (
                <p className="text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                  {filterFieldEditors.minYear ? (
                    <span>
                      From: {participantLabel(filterFieldEditors.minYear)}
                    </span>
                  ) : null}
                  {filterFieldEditors.maxYear ? (
                    <span>
                      To: {participantLabel(filterFieldEditors.maxYear)}
                    </span>
                  ) : null}
                </p>
              )}
            </section>

            {/* Actor / director */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold tracking-tight">
                Actor / director
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 shrink-0 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Include
                    </span>
                  </div>
                  <PersonTagInput
                    values={requirePeople}
                    onChange={(values) =>
                      onStateChange((p) =>
                        applyFilterListChange(
                          p,
                          "requirePeople",
                          values,
                          currentUserId,
                        ),
                      )
                    }
                    placeholder="Search for an actor or director…"
                    colorClass="bg-green-500/15 text-green-700 dark:text-green-400"
                    valueAddedBy={filterAttribution.requirePeople}
                    formatAddedBy={addedByChipLine}
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserX className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Exclude
                    </span>
                  </div>
                  <PersonTagInput
                    values={excludePeople}
                    onChange={(values) =>
                      onStateChange((p) =>
                        applyFilterListChange(
                          p,
                          "excludePeople",
                          values,
                          currentUserId,
                        ),
                      )
                    }
                    placeholder="Search for an actor or director…"
                    colorClass="bg-red-500/15 text-red-700 dark:text-red-400"
                    valueAddedBy={filterAttribution.excludePeople}
                    formatAddedBy={addedByChipLine}
                  />
                </div>
              </div>
            </section>

            {/* Genres */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold tracking-tight">
                Genres
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Include
                    </span>
                  </div>
                  <GenreTagInput
                    values={includeGenres}
                    onChange={(values) =>
                      onStateChange((p) =>
                        applyFilterListChange(
                          p,
                          "includeGenres",
                          values,
                          currentUserId,
                        ),
                      )
                    }
                    placeholder="Type or pick a genre…"
                    colorClass="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                    hint='Applies to ranked suggestions only (not an extra vote from your "Like these" films). Choose from the TMDB list or type to filter it. A suggested film must match at least one tag (OR).'
                    valueAddedBy={filterAttribution.includeGenres}
                    formatAddedBy={addedByChipLine}
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Exclude
                    </span>
                  </div>
                  <GenreTagInput
                    values={excludeGenres}
                    onChange={(values) =>
                      onStateChange((p) =>
                        applyFilterListChange(
                          p,
                          "excludeGenres",
                          values,
                          currentUserId,
                        ),
                      )
                    }
                    placeholder="Type or pick a genre…"
                    colorClass="bg-orange-500/15 text-orange-800 dark:text-orange-300"
                    hint='Applies to suggestions only. Suggested titles with any matching genre are removed. Typing "horr" still matches Horror when you add a custom tag.'
                    valueAddedBy={filterAttribution.excludeGenres}
                    formatAddedBy={addedByChipLine}
                  />
                </div>
              </div>
            </section>

            {/* Runtime */}
            <section className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight">
                Runtime
              </h3>
              <p className="text-xs text-muted-foreground">
                Max length in minutes (optional)
              </p>
              <Input
                type="number"
                placeholder="e.g. 120"
                value={maxRuntime}
                onChange={(e) =>
                  onStateChange((p) => ({
                    ...p,
                    maxRuntime: e.target.value,
                    filterFieldEditors: {
                      ...p.filterFieldEditors,
                      maxRuntime: currentUserId,
                    },
                  }))
                }
                min={1}
                className="max-w-xs"
              />
              {filterFieldEditors.maxRuntime ? (
                <p className="text-[10px] text-muted-foreground">
                  Last set by{" "}
                  {participantLabel(filterFieldEditors.maxRuntime)}
                </p>
              ) : null}
            </section>

            {/* Library & watchlist */}
            <section className="space-y-2.5 rounded-lg border border-border/80 bg-muted/20 p-3">
              <h3 className="text-base font-semibold tracking-tight">
                Library &amp; watchlist
              </h3>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="hide-logged"
                  checked={hideAllLogged}
                  onCheckedChange={(v) =>
                    onStateChange((p) => ({
                      ...p,
                      hideAllLogged: !!v,
                      filterFieldEditors: {
                        ...p.filterFieldEditors,
                        hideAllLogged: currentUserId,
                      },
                    }))
                  }
                />
                <label
                  htmlFor="hide-logged"
                  className="text-xs font-medium cursor-pointer select-none"
                >
                  Hide films participants have already logged (watchlist,
                  watching, dropped)
                </label>
              </div>
              {filterFieldEditors.hideAllLogged ? (
                <p className="text-[10px] text-muted-foreground pl-7">
                  Last toggled by{" "}
                  {participantLabel(filterFieldEditors.hideAllLogged)}
                </p>
              ) : null}
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id="plex-library-only"
                  disabled={plexFilterDisabled}
                  checked={!plexFilterDisabled && plexLibraryOnly}
                  onCheckedChange={(v) =>
                    onStateChange((p) => ({
                      ...p,
                      plexLibraryOnly: !!v,
                      filterFieldEditors: {
                        ...p.filterFieldEditors,
                        plexLibraryOnly: currentUserId,
                      },
                    }))
                  }
                  className="mt-0.5"
                />
                <div className="min-w-0 space-y-0.5">
                  <label
                    htmlFor="plex-library-only"
                    className={cn(
                      "text-xs font-medium select-none",
                      !plexFilterDisabled && "cursor-pointer",
                    )}
                  >
                    {plexSolo
                      ? "Only suggest titles in my Plex library"
                      : "Only suggest titles in all linked participants' Plex (intersection)"}
                  </label>
                  {plexSolo && !hasPlexLinked && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      <Link
                        prefetch={false}
                        href="/settings/plex"
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Link Plex in settings
                      </Link>{" "}
                      to use this filter.
                    </p>
                  )}
                  {!plexSolo && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Only people who have linked Plex are included. Those
                      without a link do not restrict the set.
                    </p>
                  )}
                </div>
              </div>
              {filterFieldEditors.plexLibraryOnly ? (
                <p className="text-[10px] text-muted-foreground pl-7">
                  Last toggled by{" "}
                  {participantLabel(filterFieldEditors.plexLibraryOnly)}
                </p>
              ) : null}
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
