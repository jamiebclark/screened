"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Plus, Loader2, Sparkles, Film, Clock, Calendar, ChevronDown, ChevronUp, Star, BookmarkCheck, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { usePickerRoomSync, ensureCurrentUserInRoom } from "./use-picker-room-sync";
import { useRouter } from "next/navigation";
import { withScoringDefaults, type PickerRoomState, type ScoredMovieJson } from "@/lib/picker-room-state";
import { Link2, Share2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface ReferenceMovie {
  mediaItemId: string;
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  weight: number;
  saved: boolean;
  hasEmbedding: boolean;
}

interface SearchResult {
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  type: string;
}

type ScoredMovie = ScoredMovieJson;

interface PickSessionProps {
  currentUser: User;
  roomId: string | null;
  initialRoomState: PickerRoomState;
}

const WEIGHTS = [
  { label: "Soft", value: 0.5 },
  { label: "Normal", value: 1.0 },
  { label: "Strong", value: 2.0 },
];

// ─── MovieSearchInput ─────────────────────────────────────────────────────────

function MovieSearchInput({
  onAdd,
  placeholder,
  existingIds,
}: {
  onAdd: (movie: ReferenceMovie) => void;
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=movie`);
      const data = await res.json() as { results: SearchResult[] };
      setResults(data.results ?? []);
      setOpen(true);
    } catch {
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
      const data = await res.json() as {
        id: string; tmdbId: number; title: string; poster: string | null;
        year: number | null; hasEmbedding: boolean;
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
        });
      }
    } catch {
      // silently fail — the movie still gets added via the existing path if embed fails
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
                    : "hover:bg-accent cursor-pointer"
                )}
              >
                {r.poster ? (
                  <Image src={r.poster} alt={r.title} width={32} height={48} className="rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-12 rounded bg-muted shrink-0 flex items-center justify-center">
                    <Film className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  {r.year && <p className="text-xs text-muted-foreground">{r.year}</p>}
                </div>
                {alreadyAdded && <span className="ml-auto text-xs text-muted-foreground shrink-0">Added</span>}
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
}: {
  movie: ReferenceMovie;
  onRemove: () => void;
  onWeightChange: (weight: number) => void;
  onSaveToggle: () => void;
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
            {movie.year && <p className="text-xs text-muted-foreground">{movie.year}</p>}
            {!movie.hasEmbedding && (
              <p className="text-xs text-amber-500 mt-0.5">No embedding — add OPENAI_API_KEY</p>
            )}
          </div>
          <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 mt-2">
          {WEIGHTS.map((w) => (
            <button
              key={w.value}
              onClick={() => onWeightChange(w.value)}
              className={cn(
                "rounded px-2 py-0.5 text-xs transition-colors border",
                movie.weight === w.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
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
              : "text-muted-foreground hover:text-foreground"
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

// ─── ScoredMovieCard ──────────────────────────────────────────────────────────

function ScoredMovieCard({ movie, rank }: { movie: ScoredMovie; rank: number }) {
  const scorePercent = Math.max(0, Math.min(100, ((movie.score + 1) / 2) * 100));

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <Link href={`/movies/${movie.tmdbId}`} className="shrink-0">
          {movie.poster ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${movie.poster}`}
              alt={movie.title}
              width={72}
              height={108}
              className="rounded object-cover hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-[72px] h-[108px] rounded bg-muted flex items-center justify-center">
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">#{rank}</span>
                <Link href={`/movies/${movie.tmdbId}`} className="font-semibold hover:underline">
                  {movie.title}
                </Link>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {movie.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {movie.year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-sm font-semibold">{(movie.attractorScore * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-muted-foreground">match</p>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${scorePercent}%` }}
            />
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres.slice(0, 4).map((g) => (
                <Badge key={g} variant="secondary" className="text-xs px-1.5 py-0">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {movie.director && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Directed by {movie.director}
              {movie.cast.length > 0 && ` · ${movie.cast.join(", ")}`}
            </p>
          )}

          {movie.overview && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{movie.overview}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── ParticipantSearch ────────────────────────────────────────────────────────

interface SearchUser {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  plexConnection: { plexUsername: string } | null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ParticipantSearch({
  participants,
  currentUserId,
  onAdd,
  onRemove,
}: {
  participants: User[];
  currentUserId: string;
  onAdd: (user: User) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);
  const participantIds = new Set(participants.map((p) => p.id));

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json() as Promise<SearchUser[]>)
      .then((data) => { setResults(data); setOpen(data.length > 0); })
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (user: SearchUser) => {
    if (!participantIds.has(user.id)) {
      onAdd({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
    }
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const initials = (name: string | null, email: string | null) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
          : (email?.[0]?.toUpperCase() ?? "U");

  return (
    <div className="space-y-3">
      {/* Selected participants */}
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
                  : "border-border bg-muted/40"
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

      {/* Search input */}
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
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(user); }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                    alreadyAdded ? "opacity-50 cursor-not-allowed" : "hover:bg-accent cursor-pointer"
                  )}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {initials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name ?? user.email}</p>
                    {user.plexConnection?.plexUsername && (
                      <p className="truncate text-xs text-muted-foreground">
                        @{user.plexConnection.plexUsername}
                      </p>
                    )}
                  </div>
                  {alreadyAdded && <span className="ml-auto text-xs text-muted-foreground shrink-0">Added</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PeopleTagInput ───────────────────────────────────────────────────────────

function PeopleTagInput({
  values,
  onChange,
  placeholder,
  colorClass,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  colorClass: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  const remove = (name: string) => onChange(values.filter((v) => v !== name));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!input.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((name) => (
            <span
              key={name}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                colorClass
              )}
            >
              {name}
              <button onClick={() => remove(name)} className="hover:opacity-70 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main PickSession Component ───────────────────────────────────────────────

export function PickSession({ currentUser, roomId, initialRoomState }: PickSessionProps) {
  const [roomState, setRoomState] = useState<PickerRoomState>(() =>
    ensureCurrentUserInRoom(withScoringDefaults(initialRoomState), currentUser)
  );
  const [startingRoom, setStartingRoom] = useState(false);
  const [tabId, setTabId] = useState("");
  const router = useRouter();
  useEffect(() => {
    setTabId(globalThis.crypto?.randomUUID() ?? `t-${Date.now()}`);
  }, []);
  const resultsRef = useRef<HTMLDivElement>(null);

  usePickerRoomSync(roomId, tabId, currentUser, roomState, setRoomState);

  const {
    participants,
    attractors,
    repellers,
    minYear,
    maxRuntime,
    requirePeople,
    excludePeople,
    hideAllLogged,
    filtersOpen,
    scoringInProgress,
    scoringError,
    scoringResults,
  } = roomState;

  useEffect(() => {
    if (scoringResults !== null && scoringResults.length > 0 && !scoringInProgress) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [scoringResults, scoringInProgress]);

  const setFiltersOpen = (v: boolean | ((b: boolean) => boolean)) =>
    setRoomState((prev) => ({
      ...prev,
      filtersOpen: typeof v === "function" ? (v as (b: boolean) => boolean)(prev.filtersOpen) : v,
    }));

  const attractorIds = new Set(attractors.map((a) => String(a.tmdbId)));
  const repellerIds = new Set(repellers.map((r) => String(r.tmdbId)));

  const addParticipant = (user: User) => {
    setRoomState((prev) =>
      prev.participants.some((p) => p.id === user.id) ? prev : { ...prev, participants: [...prev.participants, user] }
    );
  };

  const removeParticipant = (id: string) => {
    if (id === currentUser.id) return;
    setRoomState((prev) => ({ ...prev, participants: prev.participants.filter((p) => p.id !== id) }));
  };

  const updateWeight = (pool: "attractor" | "repeller", mediaItemId: string, weight: number) => {
    setRoomState((prev) => {
      if (pool === "attractor") {
        return {
          ...prev,
          attractors: prev.attractors.map((m) => (m.mediaItemId === mediaItemId ? { ...m, weight } : m)),
        };
      }
      return {
        ...prev,
        repellers: prev.repellers.map((m) => (m.mediaItemId === mediaItemId ? { ...m, weight } : m)),
      };
    });
  };

  const remove = (pool: "attractor" | "repeller", mediaItemId: string) => {
    setRoomState((prev) => {
      if (pool === "attractor") {
        return { ...prev, attractors: prev.attractors.filter((m) => m.mediaItemId !== mediaItemId) };
      }
      return { ...prev, repellers: prev.repellers.filter((m) => m.mediaItemId !== mediaItemId) };
    });
  };

  const toggleSave = async (pool: "attractor" | "repeller", movie: ReferenceMovie) => {
    const type = pool === "attractor" ? "ATTRACTOR" : "REPELLER";

    if (movie.saved) {
      const res = await fetch("/api/preferences");
      const prefs = await res.json() as Array<{ id: string; mediaItemId: string; type: string }>;
      const pref = prefs.find((p) => p.mediaItemId === movie.mediaItemId && p.type === type);
      if (pref) {
        await fetch(`/api/preferences?id=${pref.id}`, { method: "DELETE" });
      }
      setRoomState((prev) => {
        if (pool === "attractor") {
          return {
            ...prev,
            attractors: prev.attractors.map((m) => (m.mediaItemId === movie.mediaItemId ? { ...m, saved: false } : m)),
          };
        }
        return {
          ...prev,
          repellers: prev.repellers.map((m) => (m.mediaItemId === movie.mediaItemId ? { ...m, saved: false } : m)),
        };
      });
    } else {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaItemId: movie.mediaItemId, type, weight: movie.weight }),
      });
      setRoomState((prev) => {
        if (pool === "attractor") {
          return {
            ...prev,
            attractors: prev.attractors.map((m) => (m.mediaItemId === movie.mediaItemId ? { ...m, saved: true } : m)),
          };
        }
        return {
          ...prev,
          repellers: prev.repellers.map((m) => (m.mediaItemId === movie.mediaItemId ? { ...m, saved: true } : m)),
        };
      });
    }
  };

  const findMovies = async () => {
    const patchIfRoom = (next: PickerRoomState) => {
      if (roomId && tabId) {
        void fetch(`/api/picker/rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: next, sourceTabId: tabId }),
        });
      }
    };

    setRoomState((prev) => {
      const next: PickerRoomState = {
        ...prev,
        scoringInProgress: true,
        scoringError: null,
        scoringResults: null,
      };
      patchIfRoom(next);
      return next;
    });

    try {
      const res = await fetch("/api/session/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: participants.map((p) => p.id),
          attractors: attractors.map((a) => ({ mediaItemId: a.mediaItemId, weight: a.weight })),
          repellers: repellers.map((r) => ({ mediaItemId: r.mediaItemId, weight: r.weight })),
          hardFilters: {
            minYear: minYear ? parseInt(minYear) : undefined,
            maxRuntime: maxRuntime ? parseInt(maxRuntime) : undefined,
            requirePeople: requirePeople.length ? requirePeople : undefined,
            excludePeople: excludePeople.length ? excludePeople : undefined,
            hideAllLogged,
          },
        }),
      });

      const data = await res.json() as { results?: ScoredMovie[]; error?: string };
      if (!res.ok) {
        setRoomState((prev) => {
          const next: PickerRoomState = {
            ...prev,
            scoringInProgress: false,
            scoringError: data.error ?? "Scoring failed",
            scoringResults: null,
          };
          patchIfRoom(next);
          return next;
        });
      } else {
        setRoomState((prev) => {
          const next: PickerRoomState = {
            ...prev,
            scoringInProgress: false,
            scoringError: null,
            scoringResults: data.results ?? [],
          };
          patchIfRoom(next);
          return next;
        });
      }
    } catch {
      setRoomState((prev) => {
        const next: PickerRoomState = {
          ...prev,
          scoringInProgress: false,
          scoringError: "Something went wrong. Please try again.",
          scoringResults: null,
        };
        patchIfRoom(next);
        return next;
      });
    }
  };

  const canScore = participants.length > 0 && attractors.length > 0;
  const currentUserId = currentUser.id;

  const startSharedSession = async () => {
    setStartingRoom(true);
    try {
      const res = await fetch("/api/picker/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: roomState }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { id: string };
      router.push(`/pick?room=${data.id}`);
      router.refresh();
    } finally {
      setStartingRoom(false);
    }
  };

  const copyShareLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}/pick?room=${roomId}`;
    void navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
        {roomId ? (
          <>
            <p className="text-xs text-muted-foreground max-w-xl">
              Live sync: your criteria and the ranked list from the last time someone ran
              &quot;Find Movies&quot; are shared on this link. If the live stream is unavailable,
              updates fall back to polling about every 2.5s.
            </p>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copyShareLink}>
              <Link2 className="h-4 w-4" />
              Copy link
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:justify-between">
            <p className="text-xs text-muted-foreground max-w-xl">
              Share one screen: start a room and send the link so everyone can edit together in real
              time.
            </p>
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              onClick={startSharedSession}
              disabled={startingRoom}
            >
              {startingRoom ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Start shared session
            </Button>
          </div>
        )}
      </div>
      {/* Participants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Who&apos;s watching?</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantSearch
            participants={participants}
            currentUserId={currentUserId}
            onAdd={addParticipant}
            onRemove={removeParticipant}
          />
        </CardContent>
      </Card>

      {/* Reference films */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attractors */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <CardTitle className="text-base">Like these</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Films that capture the mood you&apos;re after tonight</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <MovieSearchInput
              onAdd={(movie) =>
                setRoomState((prev) => ({ ...prev, attractors: [...prev.attractors, movie] }))
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
                  onWeightChange={(w) => updateWeight("attractor", m.mediaItemId, w)}
                  onSaveToggle={() => toggleSave("attractor", m)}
                />
              ))}
              {attractors.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <Plus className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Add at least one film to match against</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Repellers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <CardTitle className="text-base">Not like these</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Films that are too intense, too slow, or just not tonight</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <MovieSearchInput
              onAdd={(movie) =>
                setRoomState((prev) => ({ ...prev, repellers: [...prev.repellers, movie] }))
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
                  onWeightChange={(w) => updateWeight("repeller", m.mediaItemId, w)}
                  onSaveToggle={() => toggleSave("repeller", m)}
                />
              ))}
              {repellers.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <X className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Optionally exclude certain vibes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hard filters */}
      <Card>
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <span className="text-sm font-medium">Hard filters</span>
          {filtersOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {filtersOpen && (
          <CardContent className="pt-0 pb-4">
            <Separator className="mb-4" />
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Earliest year</label>
                  <Input
                    type="number"
                    placeholder="e.g. 1970"
                    value={minYear}
                    onChange={(e) => setRoomState((p) => ({ ...p, minYear: e.target.value }))}
                    min={1900}
                    max={2030}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Max runtime (minutes)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 120"
                    value={maxRuntime}
                    onChange={(e) => setRoomState((p) => ({ ...p, maxRuntime: e.target.value }))}
                    min={1}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="hide-logged"
                  checked={hideAllLogged}
                  onCheckedChange={(v) => setRoomState((p) => ({ ...p, hideAllLogged: !!v }))}
                />
                <label htmlFor="hide-logged" className="text-xs font-medium cursor-pointer select-none">
                  Hide films participants have already logged (watchlist, watching, dropped)
                </label>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <UserCheck className="h-3.5 w-3.5 text-green-500" />
                  <label className="text-xs font-medium text-muted-foreground">Must include actor or director</label>
                </div>
                <PeopleTagInput
                  values={requirePeople}
                  onChange={(values) => setRoomState((p) => ({ ...p, requirePeople: values }))}
                  placeholder="e.g. George Clooney"
                  colorClass="bg-green-500/15 text-green-700 dark:text-green-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <UserX className="h-3.5 w-3.5 text-red-500" />
                  <label className="text-xs font-medium text-muted-foreground">Exclude actor or director</label>
                </div>
                <PeopleTagInput
                  values={excludePeople}
                  onChange={(values) => setRoomState((p) => ({ ...p, excludePeople: values }))}
                  placeholder="e.g. Brad Pitt"
                  colorClass="bg-red-500/15 text-red-700 dark:text-red-400"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Find movies button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={findMovies}
          disabled={!canScore || scoringInProgress}
          className="px-12 gap-2"
        >
          {scoringInProgress ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Searching your library...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Find Movies
            </>
          )}
        </Button>
      </div>

      {!canScore && (
        <p className="text-center text-sm text-muted-foreground">
          {participants.length === 0
            ? "Select at least one participant."
            : "Add at least one film to the \u201cLike these\u201d section."}
        </p>
      )}

      {/* Results */}
      {scoringInProgress && scoringResults === null && !scoringError && (
        <Card>
          <CardContent className="py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Scoring the library&hellip; everyone in this
              room will see the list when it&apos;s ready.</p>
          </CardContent>
        </Card>
      )}

      {scoringError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {scoringError}
        </div>
      )}

      {scoringResults !== null && (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {scoringResults.length === 0 ? "No matches found" : `${scoringResults.length} matches`}
            </h2>
            {scoringResults.length > 0 && (
              <p className="text-xs text-muted-foreground">Ranked by similarity to your references</p>
            )}
          </div>

          {scoringResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Film className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No unseen movies matched your criteria. Try adjusting your filters or adding more films to your library.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {scoringResults.map((movie, i) => (
                <ScoredMovieCard key={movie.id} movie={movie} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
