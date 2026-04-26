"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  X,
  Plus,
  Loader2,
  Sparkles,
  Film,
  Clock,
  Calendar,
  Star,
  BookmarkCheck,
  UserCheck,
  UserX,
  Activity,
  User,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { WatchStatusButton } from "@/components/watch-status-button";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { RatingStars } from "@/components/rating-stars";
import { usePickerRoomSync, ensureCurrentUserInRoom } from "./use-picker-room-sync";
import { useRouter } from "next/navigation";
import { withScoringDefaults, type PickerRoomState, type ReferenceMovieJson, type ScoredMovieJson } from "@/lib/picker-room-state";
import { filterTmdbMovieGenres } from "@/lib/tmdb-movie-genres";
import { describePickerStateChange } from "@/lib/picker-activity-line";
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
  genres: string[];
}

interface SearchResult {
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  type: string;
}

type ScoredMovie = ScoredMovieJson;

type PickerWatchStatus = "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED";

interface PickSessionProps {
  currentUser: User;
  roomId: string | null;
  initialRoomState: PickerRoomState;
  /** Current user has linked Plex (Plex server filter is available). */
  hasPlexLinked: boolean;
}

const WEIGHTS = [
  { label: "Soft", value: 0.5 },
  { label: "Normal", value: 1.0 },
  { label: "Strong", value: 2.0 },
];

function parseOptionalYear(s: string): number | undefined {
  if (!s.trim()) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

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

function PickerScoredMovieActions({
  tmdbId,
  title,
  initialStatus,
  initialRating,
  onInvalidatePickerStatuses,
}: {
  tmdbId: number;
  title: string;
  initialStatus: PickerWatchStatus | null;
  initialRating: number | null;
  onInvalidatePickerStatuses: () => void;
}) {
  const [trackedStatus, setTrackedStatus] = useState<PickerWatchStatus | null>(initialStatus);

  useEffect(() => {
    setTrackedStatus(initialStatus);
  }, [initialStatus]);

  const showRating = (trackedStatus ?? initialStatus) !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
      <WatchStatusButton
        tmdbId={tmdbId}
        type="movie"
        currentStatus={initialStatus}
        onStatusChange={(s) => {
          setTrackedStatus(s);
          onInvalidatePickerStatuses();
        }}
      />
      <AddToListDialog
        tmdbId={tmdbId}
        type="movie"
        title={title}
        onAddedToList={onInvalidatePickerStatuses}
      />
      {showRating && (
        <RatingStars
          tmdbId={tmdbId}
          type="movie"
          currentRating={initialRating}
          size="sm"
          onRatingChange={() => onInvalidatePickerStatuses()}
        />
      )}
    </div>
  );
}

function ScoredMovieCard({
  movie,
  rank,
  onDismiss,
  pickerMediaStatus,
  onPickerStatusesInvalidate,
}: {
  movie: ScoredMovie;
  rank: number;
  onDismiss?: (movie: ScoredMovie) => void;
  pickerMediaStatus: { status: PickerWatchStatus; rating: number | null } | undefined;
  onPickerStatusesInvalidate: () => void;
}) {
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

            <div className="text-right shrink-0 flex flex-col items-end gap-1">
              {onDismiss && (
                <button
                  type="button"
                  onClick={() => onDismiss(movie)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                  title="Not for tonight — add to Not like and hide from this list"
                  aria-label={`Remove ${movie.title} from recommendations`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
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

          <PickerScoredMovieActions
            tmdbId={movie.tmdbId}
            title={movie.title}
            initialStatus={pickerMediaStatus?.status ?? null}
            initialRating={pickerMediaStatus?.rating ?? null}
            onInvalidatePickerStatuses={onPickerStatusesInvalidate}
          />
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
      .then((data) => { setResults(data); setOpen(data.length > 0); })
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

// ─── PersonTagInput (TMDB people search) ────────────────────────────────────

type PersonResult = { id: number; name: string; role: string | null; profile: string | null };

function PersonTagInput({
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search/person?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { results?: PersonResult[] };
      const list = (data.results ?? []).filter(
        (p) => !values.some((v) => v.toLowerCase() === p.name.toLowerCase())
      );
      setResults(list);
      setOpen(list.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [values]);

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
                  {p.role && <p className="text-xs text-muted-foreground truncate">{p.role}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
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
              <button type="button" onClick={() => remove(name)} className="hover:opacity-70 transition-opacity">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GenreTagInput (TMDB movie genre list + optional freeform) ──────────────

function GenreTagInput({
  values,
  onChange,
  placeholder,
  colorClass,
  hint,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  colorClass: string;
  hint?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => filterTmdbMovieGenres(query, 10), [query]);
  const availableSuggestions = useMemo(
    () => suggestions.filter((s: string) => !values.some((v) => v.toLowerCase() === s.toLowerCase())),
    [suggestions, values]
  );

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
      {hint && <p className="text-[11px] text-muted-foreground leading-snug">{hint}</p>}
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
            {values.map((name) => (
              <span
                key={name}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  colorClass
                )}
              >
                {name}
                <button type="button" onClick={() => remove(name)} className="hover:opacity-70 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main PickSession Component ───────────────────────────────────────────────

export function PickSession({ currentUser, roomId, initialRoomState, hasPlexLinked }: PickSessionProps) {
  const [roomState, setRoomState] = useState<PickerRoomState>(() =>
    ensureCurrentUserInRoom(withScoringDefaults(initialRoomState), currentUser)
  );
  /** True after we have ever had a scored list in this session (survives temporary null while re-running). */
  const [hasCompletedListRun, setHasCompletedListRun] = useState(
    () =>
      ensureCurrentUserInRoom(withScoringDefaults(initialRoomState), currentUser).scoringResults !== null
  );
  const [startingRoom, setStartingRoom] = useState(false);
  const [tabId] = useState(() => globalThis.crypto?.randomUUID() ?? `t-${Date.now()}`);
  const [activityLines, setActivityLines] = useState<Array<{ id: string; text: string; at: number }>>([]);
  const appendActivity = useCallback((line: string) => {
    setActivityLines((lines) =>
      [
        { id: globalThis.crypto?.randomUUID() ?? `a-${Date.now()}`, text: line, at: Date.now() },
        ...lines,
      ].slice(0, 30)
    );
  }, []);
  const onRemotePickerActivity = useCallback(
    (prev: PickerRoomState, next: PickerRoomState, { sourceUserId }: { sourceUserId: string; sourceTabId: string }) => {
      if (!sourceUserId) return;
      const line = describePickerStateChange(prev, next, { actorId: sourceUserId, youId: currentUser.id });
      if (line) appendActivity(line);
    },
    [appendActivity, currentUser.id]
  );
  const [emptyScoreHint, setEmptyScoreHint] = useState<string | null>(null);
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);
  const roomStateRef = useRef(roomState);
  const roomIdRef = useRef<string | null>(roomId);
  useLayoutEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);
  useLayoutEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);
  const createRoomRequestRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (roomState.scoringResults !== null) {
      queueMicrotask(() => {
        setHasCompletedListRun(true);
      });
    }
  }, [roomState.scoringResults]);

  usePickerRoomSync(roomId, tabId, currentUser, roomState, setRoomState, {
    onRemoteApplied: onRemotePickerActivity,
  });

  const {
    participants,
    attractors,
    repellers,
    minYear,
    maxYear,
    maxRuntime,
    requirePeople,
    excludePeople,
    includeGenres,
    excludeGenres,
    vetoIds,
    plexLibraryOnly,
    hideAllLogged,
    scoringInProgress,
    scoringError,
    scoringResults,
  } = roomState;

  useEffect(() => {
    if (participants.length === 1 && !hasPlexLinked) {
      queueMicrotask(() => {
        setRoomState((p) => (p.plexLibraryOnly ? { ...p, plexLibraryOnly: false } : p));
      });
    }
  }, [hasPlexLinked, participants.length]);

  const plexSolo = participants.length === 1;
  const plexFilterDisabled = plexSolo && !hasPlexLinked;

  const runCreateRoomIfNeeded = useCallback((): Promise<void> => {
    if (roomIdRef.current) return Promise.resolve();
    if (createRoomRequestRef.current) return createRoomRequestRef.current;
    const run = (async () => {
      if (roomIdRef.current) return;
      const res = await fetch("/api/picker/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: roomStateRef.current }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { id: string };
      if (roomIdRef.current) return;
      router.replace(`/pick?room=${data.id}`);
      router.refresh();
    })().finally(() => {
      createRoomRequestRef.current = null;
    });
    createRoomRequestRef.current = run;
    return run;
  }, [router]);

  const vetoIdSet = useMemo(() => new Set(vetoIds), [vetoIds]);

  /** Union of TMDB genres on “Like these” titles — for context only; not wired to “Must include”. */
  const aggregatedAttractorGenres = useMemo(() => {
    const s = new Set<string>();
    for (const a of attractors) {
      for (const g of a.genres) {
        if (g.trim()) s.add(g);
      }
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [attractors]);

  const visibleScoringResults = useMemo(() => {
    if (scoringResults === null) return null;
    return scoringResults.filter((m) => !vetoIdSet.has(m.id));
  }, [scoringResults, vetoIdSet]);

  const [pickerStatusByTmdb, setPickerStatusByTmdb] = useState<
    Record<number, { status: PickerWatchStatus; rating: number | null }>
  >({});
  const [pickerStatusesNonce, setPickerStatusesNonce] = useState(0);

  const scoringTmdbIdsKey = useMemo(() => {
    if (scoringResults === null || scoringResults.length === 0) return "";
    return [...new Set(scoringResults.map((m) => m.tmdbId))].sort((a, b) => a - b).join(",");
  }, [scoringResults]);

  const invalidatePickerStatuses = useCallback(() => {
    setPickerStatusesNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!scoringTmdbIdsKey) {
      setPickerStatusByTmdb({});
      return;
    }
    const ac = new AbortController();
    const ids = scoringTmdbIdsKey.split(",").map((s) => parseInt(s, 10));
    void (async () => {
      try {
        const res = await fetch(`/api/media/status?tmdbIds=${encodeURIComponent(ids.join(","))}&type=movie`, {
          signal: ac.signal,
        });
        if (!res.ok || ac.signal.aborted) return;
        const data = (await res.json()) as {
          statuses?: Record<string, { status: PickerWatchStatus; rating: number | null }>;
        };
        const next: Record<number, { status: PickerWatchStatus; rating: number | null }> = {};
        for (const [k, v] of Object.entries(data.statuses ?? {})) {
          next[Number(k)] = v;
        }
        if (!ac.signal.aborted) setPickerStatusByTmdb(next);
      } catch {
        if (!ac.signal.aborted) setPickerStatusByTmdb({});
      }
    })();
    return () => ac.abort();
  }, [scoringTmdbIdsKey, pickerStatusesNonce]);

  useEffect(() => {
    if (visibleScoringResults !== null && visibleScoringResults.length > 0 && !scoringInProgress) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [visibleScoringResults, scoringInProgress]);

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
      return {
        ...prev,
        repellers: prev.repellers.filter((m) => m.mediaItemId !== mediaItemId),
        vetoIds: prev.vetoIds.filter((id) => id !== mediaItemId),
      };
    });
  };

  const dismissResult = (movie: ScoredMovie) => {
    setRoomState((prev) => {
      const nextRef: ReferenceMovieJson = {
        mediaItemId: movie.id,
        tmdbId: movie.tmdbId,
        title: movie.title,
        poster: movie.poster,
        year: movie.year,
        weight: 1.0,
        saved: false,
        hasEmbedding: true,
        genres: movie.genres,
      };
      const hasRep = prev.repellers.some((r) => r.mediaItemId === movie.id);
      return {
        ...prev,
        vetoIds: prev.vetoIds.includes(movie.id) ? prev.vetoIds : [...prev.vetoIds, movie.id],
        repellers: hasRep ? prev.repellers : [...prev.repellers, nextRef],
      };
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

    setEmptyScoreHint(null);
    setRoomState((prev) => {
      const next: PickerRoomState = {
        ...prev,
        scoringInProgress: true,
        scoringError: null,
        scoringResults: null,
      };
      patchIfRoom(next);
      const line = describePickerStateChange(prev, next, { actorId: currentUser.id, youId: currentUser.id });
      if (line) queueMicrotask(() => appendActivity(line));
      return next;
    });

    const participantIdList = participants.map((p) => p.id);
    try {
      const res = await fetch("/api/session/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: participantIdList,
          attractors: attractors.map((a) => ({ mediaItemId: a.mediaItemId, weight: a.weight })),
          repellers: repellers.map((r) => ({ mediaItemId: r.mediaItemId, weight: r.weight })),
          hardFilters: {
            minYear: parseOptionalYear(minYear),
            maxYear: parseOptionalYear(maxYear),
            maxRuntime: maxRuntime ? parseInt(maxRuntime, 10) : undefined,
            vetoIds: vetoIds.length > 0 ? vetoIds : undefined,
            requirePeople: requirePeople.length ? requirePeople : undefined,
            excludePeople: excludePeople.length ? excludePeople : undefined,
            includeGenres: includeGenres.length ? includeGenres : undefined,
            excludeGenres: excludeGenres.length ? excludeGenres : undefined,
            hideAllLogged,
          },
          plexLibraryOnly,
        }),
      });

      const data = await res.json() as { results?: ScoredMovie[]; error?: string; message?: string };
      if (!res.ok) {
        setEmptyScoreHint(null);
        setRoomState((prev) => {
          const next: PickerRoomState = {
            ...prev,
            scoringInProgress: false,
            scoringError: data.error ?? "Scoring failed",
            scoringResults: null,
          };
          patchIfRoom(next);
          const line = describePickerStateChange(prev, next, { actorId: currentUser.id, youId: currentUser.id });
          if (line) queueMicrotask(() => appendActivity(line));
          return next;
        });
      } else {
        const list = data.results ?? [];
        if (list.length === 0 && data.message) {
          setEmptyScoreHint(data.message);
        } else {
          setEmptyScoreHint(null);
        }
        setRoomState((prev) => {
          const next: PickerRoomState = {
            ...prev,
            scoringInProgress: false,
            scoringError: null,
            scoringResults: list,
          };
          patchIfRoom(next);
          const line = describePickerStateChange(prev, next, { actorId: currentUser.id, youId: currentUser.id });
          if (line) queueMicrotask(() => appendActivity(line));
          return next;
        });
      }
    } catch {
      setEmptyScoreHint(null);
      setRoomState((prev) => {
        const next: PickerRoomState = {
          ...prev,
          scoringInProgress: false,
          scoringError: "Something went wrong. Please try again.",
          scoringResults: null,
        };
        patchIfRoom(next);
        const line = describePickerStateChange(prev, next, { actorId: currentUser.id, youId: currentUser.id });
        if (line) queueMicrotask(() => appendActivity(line));
        return next;
      });
    }
  };

  const canScore = participants.length > 0 && attractors.length > 0;
  const currentUserId = currentUser.id;

  useEffect(() => {
    if (roomId) return;
    if (attractors.length === 0) return;
    void runCreateRoomIfNeeded();
  }, [attractors.length, roomId, runCreateRoomIfNeeded]);

  const startSharedSession = async () => {
    setStartingRoom(true);
    try {
      await runCreateRoomIfNeeded();
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
              Live sync: your criteria and the last ranked list from this link are shared with
              everyone here. If the live stream is unavailable,
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18.5rem] xl:grid-cols-[1fr_20rem] items-start">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
            <Card className="min-w-0">
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
                      For reference only. &quot;Must include&quot; / &quot;Exclude genres&quot; in Hard filters apply to the ranked
                      suggestions—they are not filled in from this list, and your picks steer similarity via embeddings, not
                      via these tags.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <CardTitle className="text-base">Not like these</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Too intense, too slow, or not tonight</p>
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
                    <div className="rounded-lg border border-dashed border-border p-3 text-center">
                      <X className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Add vibes to steer away from, or use ✕ on a suggestion</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hard filters</CardTitle>
              <p className="text-xs text-muted-foreground">Optional bounds for year, runtime, cast, and genres</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">Watchlist &amp; library</p>
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
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="plex-library-only"
                      disabled={plexFilterDisabled}
                      checked={!plexFilterDisabled && plexLibraryOnly}
                      onCheckedChange={(v) => setRoomState((p) => ({ ...p, plexLibraryOnly: !!v }))}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 space-y-0.5">
                      <label
                        htmlFor="plex-library-only"
                        className={cn(
                          "text-xs font-medium select-none",
                          !plexFilterDisabled && "cursor-pointer"
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
                          Only people who have linked Plex are included. Those without a link do not
                          restrict the set.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      id="pick-year-range-label"
                    >
                      Release year
                    </label>
                    <div
                      role="group"
                      aria-labelledby="pick-year-range-label"
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
                        onChange={(e) => setRoomState((p) => ({ ...p, minYear: e.target.value }))}
                        className="h-9 w-[3.5rem] shrink-0 border-0 bg-transparent px-1.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
                      />
                      <span className="shrink-0 select-none text-muted-foreground" aria-hidden>
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
                        onChange={(e) => setRoomState((p) => ({ ...p, maxYear: e.target.value }))}
                        className="h-9 w-[3.5rem] shrink-0 border-0 bg-transparent px-1.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
                      />
                    </div>
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

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <UserCheck className="h-3.5 w-3.5 text-green-500" />
                    <label className="text-xs font-medium text-muted-foreground">Must include actor or director</label>
                  </div>
                  <PersonTagInput
                    values={requirePeople}
                    onChange={(values) => setRoomState((p) => ({ ...p, requirePeople: values }))}
                    placeholder="Search for an actor or director…"
                    colorClass="bg-green-500/15 text-green-700 dark:text-green-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <UserX className="h-3.5 w-3.5 text-red-500" />
                    <label className="text-xs font-medium text-muted-foreground">Exclude actor or director</label>
                  </div>
                  <PersonTagInput
                    values={excludePeople}
                    onChange={(values) => setRoomState((p) => ({ ...p, excludePeople: values }))}
                    placeholder="Search for an actor or director…"
                    colorClass="bg-red-500/15 text-red-700 dark:text-red-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="h-3.5 w-3.5 text-emerald-500" />
                    <label className="text-xs font-medium text-muted-foreground">Must include a genre</label>
                  </div>
                  <GenreTagInput
                    values={includeGenres}
                    onChange={(values) => setRoomState((p) => ({ ...p, includeGenres: values }))}
                    placeholder="Type or pick a genre…"
                    colorClass="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                    hint='Applies to ranked suggestions only (not an extra vote from your "Like these" films). Choose from the TMDB list or type to filter it. A suggested film must match at least one tag (OR).'
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="h-3.5 w-3.5 text-orange-500" />
                    <label className="text-xs font-medium text-muted-foreground">Exclude genres</label>
                  </div>
                  <GenreTagInput
                    values={excludeGenres}
                    onChange={(values) => setRoomState((p) => ({ ...p, excludeGenres: values }))}
                    placeholder="Type or pick a genre…"
                    colorClass="bg-orange-500/15 text-orange-800 dark:text-orange-300"
                    hint='Applies to suggestions only. Suggested titles with any matching genre are removed. Typing "horr" still matches Horror when you add a custom tag.'
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                  {hasCompletedListRun ? "Refining matches..." : "Finding recommendations..."}
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {hasCompletedListRun ? "Refine list" : "Find movies"}
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

          {scoringInProgress && scoringResults === null && !scoringError && (
            <Card>
              <CardContent className="py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {hasCompletedListRun
                    ? "Updating your matches&hellip; everyone in this room will see the list when it&apos;s ready."
                    : "Pulling similar and recommended titles, then ranking with your picks&hellip; everyone in this room will see the list when it&apos;s ready."}
                </p>
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
                  {scoringResults.length === 0
                    ? "No matches found"
                    : visibleScoringResults === null || visibleScoringResults.length === 0
                      ? "No suggestions left in this list"
                      : `${visibleScoringResults.length} match${visibleScoringResults.length === 1 ? "" : "es"}`}
                </h2>
                {visibleScoringResults !== null && visibleScoringResults.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Similar &amp; recommended titles, ranked by your likes and not-likes
                  </p>
                )}
              </div>

              {scoringResults.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Film className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {emptyScoreHint ??
                        "No results for this run. Try different references, switch search mode, or relax filters."}
                    </p>
                  </CardContent>
                </Card>
              ) : visibleScoringResults === null || visibleScoringResults.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                      Every suggestion from this run is marked not for tonight. Run the search again with
                      the button above, or remove titles from Not like these to bring them back into play.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {visibleScoringResults.map((movie, i) => (
                    <ScoredMovieCard
                      key={movie.id}
                      movie={movie}
                      rank={i + 1}
                      onDismiss={dismissResult}
                      pickerMediaStatus={pickerStatusByTmdb[movie.tmdbId]}
                      onPickerStatusesInvalidate={invalidatePickerStatuses}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Session</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                Who ran a search, changed criteria, or edited the list—newest first. Others appear when the room is
                shared; your own runs also show as &quot;You&quot; on this device.
              </p>
            </CardHeader>
            <CardContent
              className="space-y-2"
              role="region"
              aria-label="Session activity"
            >
              {activityLines.length === 0 ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {roomId
                    ? "No events yet. When a participant edits or runs the picker, a line will show here."
                    : "Start a shared room and open the same link to see what each person does in real time."}
                </p>
              ) : (
                <ul className="max-h-64 list-none space-y-2 overflow-y-auto pl-0 pr-1 text-xs leading-snug">
                  {activityLines.map((row) => (
                    <li key={row.id} className="text-foreground/90">
                      {row.text}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
