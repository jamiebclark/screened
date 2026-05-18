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
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// ─── Embed helper ─────────────────────────────────────────────────────────────

async function fetchMovieEmbed(
  result: SearchResult,
): Promise<ReferenceMovieJson | null> {
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
    if (!res.ok) return null;
    return {
      mediaItemId: data.id,
      tmdbId: data.tmdbId,
      title: data.title,
      poster: data.poster,
      year: data.year,
      weight: 1.0,
      saved: false,
      hasEmbedding: data.hasEmbedding,
      genres: data.genres ?? [],
    };
  } catch {
    return null;
  }
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  label,
  onRemove,
  colorClass,
  icon,
  byLine,
}: {
  label: string;
  onRemove: () => void;
  colorClass?: string;
  icon?: React.ReactNode;
  byLine?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-col rounded-full px-2.5 py-1 text-xs font-medium",
        colorClass ?? "bg-muted text-muted-foreground",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {icon}
        {label}
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity ml-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
      {byLine && (
        <span className="text-2xs font-normal text-muted-foreground leading-tight mt-0.5 pl-0.5">
          {byLine}
        </span>
      )}
    </span>
  );
}

// ─── MovieModalSearchInput ────────────────────────────────────────────────────

function MovieModalSearchInput({
  onAddAttractor,
  onAddRepeller,
  existingIds,
}: {
  onAddAttractor: (movie: ReferenceMovieJson) => void;
  onAddRepeller: (movie: ReferenceMovieJson) => void;
  existingIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<{
    id: number;
    kind: "like" | "avoid";
  } | null>(null);
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

  const handleAdd = async (result: SearchResult, kind: "like" | "avoid") => {
    setAdding({ id: result.tmdbId, kind });
    setOpen(false);
    setQuery("");
    setResults([]);
    const movie = await fetchMovieEmbed(result);
    if (movie) {
      if (kind === "like") onAddAttractor(movie);
      else onAddRepeller(movie);
    } else {
      toast({
        variant: "destructive",
        description: `Could not add "${result.title}". Please try again.`,
      });
    }
    setAdding(null);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search for a film…"
          className="pl-9 pr-9"
          autoFocus
        />
        {(loading || adding !== null) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-72 overflow-y-auto">
          {results.map((r) => {
            const alreadyAdded = existingIds.has(String(r.tmdbId));
            const isAdding = adding?.id === r.tmdbId;
            return (
              <div
                key={r.tmdbId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm",
                  alreadyAdded && "opacity-50",
                )}
              >
                {r.poster ? (
                  <Image
                    src={r.poster}
                    alt={r.title}
                    width={28}
                    height={42}
                    className="rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                    <Film className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  {r.year && (
                    <p className="text-xs text-muted-foreground">{r.year}</p>
                  )}
                </div>
                {alreadyAdded ? (
                  <span className="text-xs text-muted-foreground shrink-0">
                    Added
                  </span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAdd(r, "like")}
                      title="Like this film"
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                    >
                      {isAdding && adding?.kind === "like" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-3 w-3" />
                      )}
                      Like
                    </button>
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAdd(r, "avoid")}
                      title="Avoid this film"
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                    >
                      {isAdding && adding?.kind === "avoid" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ThumbsDown className="h-3 w-3" />
                      )}
                      Avoid
                    </button>
                  </div>
                )}
              </div>
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
              <p className="text-2xs text-muted-foreground mt-0.5">
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
                <AvatarFallback className="text-2xs">
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
                    <AvatarFallback className="text-2xs">
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
                  <span className="text-2xs font-normal text-muted-foreground leading-tight mt-0.5 pl-0.5">
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
        (s: string) => !values.some((v) => v.toLowerCase() === s.toLowerCase()),
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
        <p className="text-xs text-muted-foreground leading-snug">{hint}</p>
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
                    <span className="text-2xs font-normal text-muted-foreground leading-tight mt-0.5 pl-0.5">
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

// ─── FilterTile ───────────────────────────────────────────────────────────────

function FilterTile({
  icon: Icon,
  label,
  activeLabel,
  onClick,
  active,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  activeLabel?: string | null;
  onClick: () => void;
  active?: boolean;
  badge?: number;
}) {
  const displayLabel = active && activeLabel ? activeLabel : label;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 px-6 py-5 min-w-[96px] transition-all select-none",
        active
          ? "border-primary bg-primary/8 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-accent/50",
      )}
    >
      <Icon className="h-8 w-8 shrink-0" />
      <span className="text-sm font-semibold text-center max-w-[90px] truncate leading-tight">
        {displayLabel}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-2xs font-bold flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
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

  const [movieOpen, setMovieOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [runtimeOpen, setRuntimeOpen] = useState(false);

  const addedByChipLine = useCallback(
    (userId: string) => `Added by ${participantLabel(userId)}`,
    [participantLabel],
  );

  const multiParticipant = participants.length > 1;

  const attractorIds = new Set(attractors.map((a) => String(a.tmdbId)));
  const repellerIds = new Set(repellers.map((r) => String(r.tmdbId)));
  const allMovieIds = new Set([...attractorIds, ...repellerIds]);

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

  // Year button label
  const yearLabel = (() => {
    const from = minYear.trim();
    const to = maxYear.trim();
    if (from && to) return `${from}–${to}`;
    if (from) return `From ${from}`;
    if (to) return `Until ${to}`;
    return null;
  })();

  const runtimeLabel = maxRuntime.trim() ? `≤ ${maxRuntime} min` : null;

  const hasPills =
    attractors.length > 0 ||
    repellers.length > 0 ||
    requirePeople.length > 0 ||
    excludePeople.length > 0 ||
    includeGenres.length > 0 ||
    excludeGenres.length > 0;

  return (
    <div className="space-y-4">
      {/* ── Filter tiles ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-3">
        <FilterTile
          icon={Film}
          label="Movie"
          onClick={() => setMovieOpen(true)}
          active={attractors.length > 0 || repellers.length > 0}
          badge={attractors.length + repellers.length || undefined}
        />
        <FilterTile
          icon={User}
          label="Person"
          onClick={() => setPersonOpen(true)}
          active={requirePeople.length > 0 || excludePeople.length > 0}
          badge={requirePeople.length + excludePeople.length || undefined}
        />
        <FilterTile
          icon={Tag}
          label="Genre"
          onClick={() => setGenreOpen(true)}
          active={includeGenres.length > 0 || excludeGenres.length > 0}
          badge={includeGenres.length + excludeGenres.length || undefined}
        />
        <FilterTile
          icon={Calendar}
          label="Year"
          activeLabel={yearLabel}
          onClick={() => setYearOpen(true)}
          active={!!yearLabel}
        />
        <FilterTile
          icon={Clock}
          label="Runtime"
          activeLabel={runtimeLabel}
          onClick={() => setRuntimeOpen(true)}
          active={!!runtimeLabel}
        />
      </div>

      {/* ── Active filter pills ────────────────────────────────────────── */}
      {hasPills && (
        <div className="flex flex-wrap gap-1.5 items-start">
          {attractors.map((m) => (
            <FilterPill
              key={`attr-${m.mediaItemId}`}
              label={m.title}
              icon={<ThumbsUp className="h-3 w-3" />}
              colorClass="bg-green-500/15 text-green-700 dark:text-green-400"
              onRemove={() => remove("attractor", m.mediaItemId)}
              byLine={
                multiParticipant && m.addedByUserId
                  ? addedByChipLine(m.addedByUserId)
                  : null
              }
            />
          ))}
          {repellers.map((m) => (
            <FilterPill
              key={`rep-${m.mediaItemId}`}
              label={m.title}
              icon={<ThumbsDown className="h-3 w-3" />}
              colorClass="bg-red-500/15 text-red-700 dark:text-red-400"
              onRemove={() => remove("repeller", m.mediaItemId)}
              byLine={
                multiParticipant && m.addedByUserId
                  ? addedByChipLine(m.addedByUserId)
                  : null
              }
            />
          ))}
          {requirePeople.map((name) => (
            <FilterPill
              key={`rp-${name}`}
              label={name}
              icon={<UserCheck className="h-3 w-3" />}
              colorClass="bg-green-500/15 text-green-700 dark:text-green-400"
              onRemove={() =>
                onStateChange((p) =>
                  applyFilterListChange(
                    p,
                    "requirePeople",
                    requirePeople.filter((n) => n !== name),
                    currentUserId,
                  ),
                )
              }
              byLine={
                multiParticipant && filterAttribution.requirePeople?.[name]
                  ? addedByChipLine(filterAttribution.requirePeople[name]!)
                  : null
              }
            />
          ))}
          {excludePeople.map((name) => (
            <FilterPill
              key={`ep-${name}`}
              label={name}
              icon={<UserX className="h-3 w-3" />}
              colorClass="bg-red-500/15 text-red-700 dark:text-red-400"
              onRemove={() =>
                onStateChange((p) =>
                  applyFilterListChange(
                    p,
                    "excludePeople",
                    excludePeople.filter((n) => n !== name),
                    currentUserId,
                  ),
                )
              }
              byLine={
                multiParticipant && filterAttribution.excludePeople?.[name]
                  ? addedByChipLine(filterAttribution.excludePeople[name]!)
                  : null
              }
            />
          ))}
          {includeGenres.map((name) => (
            <FilterPill
              key={`ig-${name}`}
              label={name}
              icon={<Tag className="h-3 w-3" />}
              colorClass="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              onRemove={() =>
                onStateChange((p) =>
                  applyFilterListChange(
                    p,
                    "includeGenres",
                    includeGenres.filter((n) => n !== name),
                    currentUserId,
                  ),
                )
              }
              byLine={
                multiParticipant && filterAttribution.includeGenres?.[name]
                  ? addedByChipLine(filterAttribution.includeGenres[name]!)
                  : null
              }
            />
          ))}
          {excludeGenres.map((name) => (
            <FilterPill
              key={`eg-${name}`}
              label={name}
              icon={<Tag className="h-3 w-3" />}
              colorClass="bg-orange-500/15 text-orange-800 dark:text-orange-300"
              onRemove={() =>
                onStateChange((p) =>
                  applyFilterListChange(
                    p,
                    "excludeGenres",
                    excludeGenres.filter((n) => n !== name),
                    currentUserId,
                  ),
                )
              }
              byLine={
                multiParticipant && filterAttribution.excludeGenres?.[name]
                  ? addedByChipLine(filterAttribution.excludeGenres[name]!)
                  : null
              }
            />
          ))}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!hasPills && !yearLabel && !runtimeLabel && (
        <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Add a movie you&apos;re in the mood for to get started.
          </p>
          <p className="text-xs text-muted-foreground">
            Use the buttons above to add movies, people, or genres to match
            against.
          </p>
        </div>
      )}

      {/* ── Library & watchlist ────────────────────────────────────────── */}
      <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/20 p-3">
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
            Hide films participants have already logged (watchlist, watching,
            dropped)
          </label>
        </div>
        {filterFieldEditors.hideAllLogged ? (
          <p className="text-2xs text-muted-foreground pl-7">
            Last toggled by {participantLabel(filterFieldEditors.hideAllLogged)}
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
              <p className="text-xs text-muted-foreground leading-snug">
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
              <p className="text-xs text-muted-foreground leading-snug">
                Only people who have linked Plex are included. Those without a
                link do not restrict the set.
              </p>
            )}
          </div>
        </div>
        {filterFieldEditors.plexLibraryOnly ? (
          <p className="text-2xs text-muted-foreground pl-7">
            Last toggled by{" "}
            {participantLabel(filterFieldEditors.plexLibraryOnly)}
          </p>
        ) : null}
      </div>

      {/* ── Movie modal ────────────────────────────────────────────────── */}
      <Dialog open={movieOpen} onOpenChange={setMovieOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Movies</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Search for a film and mark it as something you&apos;d like or want
              to avoid.
            </p>
          </DialogHeader>

          <div className="px-6 shrink-0">
            <MovieModalSearchInput
              onAddAttractor={(movie) =>
                onStateChange((prev) => ({
                  ...prev,
                  attractors: [
                    ...prev.attractors,
                    { ...movie, addedByUserId: currentUserId },
                  ],
                }))
              }
              onAddRepeller={(movie) =>
                onStateChange((prev) => ({
                  ...prev,
                  repellers: [
                    ...prev.repellers,
                    { ...movie, addedByUserId: currentUserId },
                  ],
                }))
              }
              existingIds={allMovieIds}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-4 min-h-0">
            {attractors.length === 0 && repellers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No movies added yet. Search above to get started.
              </p>
            )}

            {attractors.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Like these
                  </span>
                </div>
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
                        multiParticipant && m.addedByUserId
                          ? addedByChipLine(m.addedByUserId)
                          : null
                      }
                    />
                  ))}
                </div>
                {aggregatedAttractorGenres.length > 0 && (
                  <div className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Genres across your &quot;Like these&quot; picks
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {aggregatedAttractorGenres.map((g) => (
                        <span
                          key={g}
                          className="rounded border border-border/70 bg-background/50 px-1.5 py-0.5 text-2xs text-muted-foreground"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                    <p className="text-2xs text-muted-foreground leading-snug">
                      For reference only. Scoring uses embeddings, not genre
                      tags. Use the Genre filter to hard-filter suggestions.
                    </p>
                  </div>
                )}
              </section>
            )}

            {repellers.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Avoid these
                  </span>
                </div>
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
                        multiParticipant && m.addedByUserId
                          ? addedByChipLine(m.addedByUserId)
                          : null
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Person modal ───────────────────────────────────────────────── */}
      <Dialog open={personOpen} onOpenChange={setPersonOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Person</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Filter suggestions by actor or director.
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5 min-h-0">
            <section className="space-y-2">
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Must include
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
                formatAddedBy={multiParticipant ? addedByChipLine : undefined}
              />
            </section>
            <section className="space-y-2">
              <div className="flex items-center gap-1.5">
                <UserX className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
                formatAddedBy={multiParticipant ? addedByChipLine : undefined}
              />
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Genre modal ────────────────────────────────────────────────── */}
      <Dialog open={genreOpen} onOpenChange={setGenreOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle>Genre</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Hard-filter suggestions by genre. A suggestion must match at least
              one included genre (OR logic).
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5 min-h-0">
            <section className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Must include
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
                valueAddedBy={filterAttribution.includeGenres}
                formatAddedBy={multiParticipant ? addedByChipLine : undefined}
              />
            </section>
            <section className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
                valueAddedBy={filterAttribution.excludeGenres}
                formatAddedBy={multiParticipant ? addedByChipLine : undefined}
              />
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Year modal ─────────────────────────────────────────────────── */}
      <Dialog open={yearOpen} onOpenChange={setYearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Year range</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Restrict suggestions to a release year range.
            </p>
          </DialogHeader>
          <div
            role="group"
            aria-label="Release year range"
            className="flex h-9 w-fit items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring"
          >
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="?"
              aria-label="From year"
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
              className="h-9 w-14 shrink-0 border-0 bg-transparent px-1.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
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
              aria-label="To year"
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
              className="h-9 w-14 shrink-0 border-0 bg-transparent px-1.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
            />
          </div>
          {(filterFieldEditors.minYear || filterFieldEditors.maxYear) && (
            <p className="text-2xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
              {filterFieldEditors.minYear ? (
                <span>
                  From: {participantLabel(filterFieldEditors.minYear)}
                </span>
              ) : null}
              {filterFieldEditors.maxYear ? (
                <span>To: {participantLabel(filterFieldEditors.maxYear)}</span>
              ) : null}
            </p>
          )}
          <div className="flex justify-between items-center pt-1">
            {yearLabel ? (
              <button
                type="button"
                onClick={() =>
                  onStateChange((p) => ({
                    ...p,
                    minYear: "",
                    maxYear: "",
                  }))
                }
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={() => setYearOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Runtime modal ──────────────────────────────────────────────── */}
      <Dialog open={runtimeOpen} onOpenChange={setRuntimeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Runtime</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Maximum film length in minutes.
            </p>
          </DialogHeader>
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
            <p className="text-2xs text-muted-foreground">
              Last set by {participantLabel(filterFieldEditors.maxRuntime)}
            </p>
          ) : null}
          <div className="flex justify-between items-center pt-1">
            {runtimeLabel ? (
              <button
                type="button"
                onClick={() => onStateChange((p) => ({ ...p, maxRuntime: "" }))}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={() => setRuntimeOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
