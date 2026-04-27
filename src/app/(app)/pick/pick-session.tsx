"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Loader2, Link2, Share2, Radio, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  usePickerRoomSync,
  ensureCurrentUserInRoom,
} from "./use-picker-room-sync";
import { useRouter } from "next/navigation";
import {
  withScoringDefaults,
  type PickerRoomState,
  type ReferenceMovieJson,
  type ScoredMovieJson,
} from "@/lib/picker-room-state";
import {
  computePickerScoreFingerprint,
  hydratePickerFingerprintIfNeeded,
} from "@/lib/picker-score-fingerprint";
import { describePickerStateChange } from "@/lib/picker-activity-line";
import { parseOptionalYear } from "./picker-form";
import { PickerForm, ParticipantSearch } from "./picker-form";
import { PickerResults } from "./picker-results";
import { PickerActivity } from "./picker-activity";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface PickSessionProps {
  currentUser: User;
  roomId: string | null;
  initialRoomState: PickerRoomState;
  /** Current user has linked Plex (Plex server filter is available). */
  hasPlexLinked: boolean;
}

type PickerWatchStatus = "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED";

// ─── PickSession ──────────────────────────────────────────────────────────────

export function PickSession({
  currentUser,
  roomId,
  initialRoomState,
  hasPlexLinked,
}: PickSessionProps) {
  const [roomState, setRoomState] = useState<PickerRoomState>(() =>
    ensureCurrentUserInRoom(
      hydratePickerFingerprintIfNeeded(withScoringDefaults(initialRoomState)),
      currentUser,
    ),
  );

  const [hasCompletedListRun, setHasCompletedListRun] = useState(
    () =>
      ensureCurrentUserInRoom(
        hydratePickerFingerprintIfNeeded(withScoringDefaults(initialRoomState)),
        currentUser,
      ).scoringResults !== null,
  );
  const [startingRoom, setStartingRoom] = useState(false);
  const [tabId] = useState(
    () => globalThis.crypto?.randomUUID() ?? `t-${Date.now()}`,
  );
  const [activityLines, setActivityLines] = useState<
    Array<{ id: string; text: string; at: number }>
  >([]);
  const [emptyScoreHint, setEmptyScoreHint] = useState<string | null>(null);
  const [pickerStatusByTmdb, setPickerStatusByTmdb] = useState<
    Record<number, { status: PickerWatchStatus; rating: number | null }>
  >({});
  const [pickerStatusesNonce, setPickerStatusesNonce] = useState(0);

  const router = useRouter();
  const roomStateRef = useRef(roomState);
  const roomIdRef = useRef<string | null>(roomId);
  const createRoomRequestRef = useRef<Promise<void> | null>(null);

  useLayoutEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);
  useLayoutEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const appendActivity = useCallback((line: string) => {
    setActivityLines((lines) =>
      [
        {
          id: globalThis.crypto?.randomUUID() ?? `a-${Date.now()}`,
          text: line,
          at: Date.now(),
        },
        ...lines,
      ].slice(0, 30),
    );
  }, []);

  const onRemotePickerActivity = useCallback(
    (
      prev: PickerRoomState,
      next: PickerRoomState,
      { sourceUserId }: { sourceUserId: string; sourceTabId: string },
    ) => {
      if (!sourceUserId) return;
      const line = describePickerStateChange(prev, next, {
        actorId: sourceUserId,
        youId: currentUser.id,
      });
      if (line) appendActivity(line);
    },
    [appendActivity, currentUser.id],
  );

  const { isPollFallback } = usePickerRoomSync(
    roomId,
    tabId,
    currentUser,
    roomState,
    setRoomState,
    { onRemoteApplied: onRemotePickerActivity },
  );

  const {
    participants,
    attractors,
    repellers,
    vetoIds,
    scoringInProgress,
    scoringError,
    scoringResults,
    lastScoreFingerprint,
  } = roomState;

  const participantLabel = useCallback(
    (userId: string) => {
      if (userId === currentUser.id) return "You";
      const p = participants.find((x) => x.id === userId);
      const n = p?.name?.trim();
      if (n) return n;
      if (p?.email) return p.email.split("@")[0] ?? p.email;
      return "Someone";
    },
    [participants, currentUser.id],
  );

  useEffect(() => {
    if (roomState.scoringResults !== null) {
      queueMicrotask(() => setHasCompletedListRun(true));
    }
  }, [roomState.scoringResults]);

  useEffect(() => {
    if (participants.length === 1 && !hasPlexLinked) {
      queueMicrotask(() => {
        setRoomState((p) =>
          p.plexLibraryOnly ? { ...p, plexLibraryOnly: false } : p,
        );
      });
    }
  }, [hasPlexLinked, participants.length]);

  const currentScoreFingerprint = computePickerScoreFingerprint(roomState);
  const criteriaDirty =
    scoringResults != null &&
    scoringResults.length > 0 &&
    !scoringInProgress &&
    lastScoreFingerprint != null &&
    currentScoreFingerprint !== lastScoreFingerprint;

  const firstRunReady =
    attractors.length > 0 && !hasCompletedListRun && !scoringInProgress;

  const vetoIdSet = useMemo(() => new Set(vetoIds), [vetoIds]);

  const visibleScoringResults = useMemo(() => {
    if (scoringResults === null) return null;
    return scoringResults.filter((m) => !vetoIdSet.has(m.id));
  }, [scoringResults, vetoIdSet]);

  const scoringTmdbIdsKey = useMemo(() => {
    if (scoringResults === null || scoringResults.length === 0) return "";
    return [...new Set(scoringResults.map((m) => m.tmdbId))]
      .sort((a, b) => a - b)
      .join(",");
  }, [scoringResults]);

  const invalidatePickerStatuses = useCallback(() => {
    setPickerStatusesNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const ids = scoringTmdbIdsKey.split(",").map((s) => parseInt(s, 10));
    void (async () => {
      await Promise.resolve();
      if (ac.signal.aborted) return;
      if (!scoringTmdbIdsKey) {
        setPickerStatusByTmdb({});
        return;
      }
      try {
        const res = await fetch(
          `/api/media/status?tmdbIds=${encodeURIComponent(ids.join(","))}&type=movie`,
          { signal: ac.signal },
        );
        if (!res.ok || ac.signal.aborted) return;
        const data = (await res.json()) as {
          statuses?: Record<
            string,
            { status: PickerWatchStatus; rating: number | null }
          >;
        };
        const next: Record<
          number,
          { status: PickerWatchStatus; rating: number | null }
        > = {};
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

  // ─── Room management ────────────────────────────────────────────────────────

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

  // ─── Participant management ──────────────────────────────────────────────────

  const addParticipant = (user: User) => {
    setRoomState((prev) =>
      prev.participants.some((p) => p.id === user.id)
        ? prev
        : { ...prev, participants: [...prev.participants, user] },
    );
  };

  const removeParticipant = (id: string) => {
    if (id === currentUser.id) return;
    setRoomState((prev) => ({
      ...prev,
      participants: prev.participants.filter((p) => p.id !== id),
    }));
  };

  // ─── Scoring handlers ────────────────────────────────────────────────────────

  const dismissResult = (movie: ScoredMovieJson) => {
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
        addedByUserId: currentUser.id,
      };
      const hasRep = prev.repellers.some((r) => r.mediaItemId === movie.id);
      const next: PickerRoomState = {
        ...prev,
        vetoIds: prev.vetoIds.includes(movie.id)
          ? prev.vetoIds
          : [...prev.vetoIds, movie.id],
        repellers: hasRep ? prev.repellers : [...prev.repellers, nextRef],
      };
      const line = describePickerStateChange(prev, next, {
        actorId: currentUser.id,
        youId: currentUser.id,
      });
      if (line) queueMicrotask(() => appendActivity(line));
      return next;
    });
  };

  const undoDismiss = (movieId: string) => {
    setRoomState((prev) => ({
      ...prev,
      vetoIds: prev.vetoIds.filter((id) => id !== movieId),
      repellers: prev.repellers.filter((r) => r.mediaItemId !== movieId),
    }));
  };

  const toggleSave = async (
    pool: "attractor" | "repeller",
    movie: ReferenceMovieJson,
  ) => {
    const type = pool === "attractor" ? "ATTRACTOR" : "REPELLER";

    if (movie.saved) {
      const res = await fetch("/api/preferences");
      const prefs = (await res.json()) as Array<{
        id: string;
        mediaItemId: string;
        type: string;
      }>;
      const pref = prefs.find(
        (p) => p.mediaItemId === movie.mediaItemId && p.type === type,
      );
      if (pref) {
        await fetch(`/api/preferences?id=${pref.id}`, { method: "DELETE" });
      }
      setRoomState((prev) => {
        if (pool === "attractor") {
          return {
            ...prev,
            attractors: prev.attractors.map((m) =>
              m.mediaItemId === movie.mediaItemId ? { ...m, saved: false } : m,
            ),
          };
        }
        return {
          ...prev,
          repellers: prev.repellers.map((m) =>
            m.mediaItemId === movie.mediaItemId ? { ...m, saved: false } : m,
          ),
        };
      });
    } else {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaItemId: movie.mediaItemId,
          type,
          weight: movie.weight,
        }),
      });
      setRoomState((prev) => {
        if (pool === "attractor") {
          return {
            ...prev,
            attractors: prev.attractors.map((m) =>
              m.mediaItemId === movie.mediaItemId ? { ...m, saved: true } : m,
            ),
          };
        }
        return {
          ...prev,
          repellers: prev.repellers.map((m) =>
            m.mediaItemId === movie.mediaItemId ? { ...m, saved: true } : m,
          ),
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
      const line = describePickerStateChange(prev, next, {
        actorId: currentUser.id,
        youId: currentUser.id,
      });
      if (line) queueMicrotask(() => appendActivity(line));
      return next;
    });

    try {
      const res = await fetch("/api/session/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: participants.map((p) => p.id),
          attractors: attractors.map((a) => ({
            mediaItemId: a.mediaItemId,
            weight: a.weight,
          })),
          repellers: repellers.map((r) => ({
            mediaItemId: r.mediaItemId,
            weight: r.weight,
          })),
          hardFilters: {
            minYear: parseOptionalYear(roomState.minYear),
            maxYear: parseOptionalYear(roomState.maxYear),
            maxRuntime: roomState.maxRuntime
              ? parseInt(roomState.maxRuntime, 10)
              : undefined,
            vetoIds: vetoIds.length > 0 ? vetoIds : undefined,
            requirePeople: roomState.requirePeople.length
              ? roomState.requirePeople
              : undefined,
            excludePeople: roomState.excludePeople.length
              ? roomState.excludePeople
              : undefined,
            includeGenres: roomState.includeGenres.length
              ? roomState.includeGenres
              : undefined,
            excludeGenres: roomState.excludeGenres.length
              ? roomState.excludeGenres
              : undefined,
            hideAllLogged: roomState.hideAllLogged,
          },
          plexLibraryOnly: roomState.plexLibraryOnly,
        }),
      });

      const data = (await res.json()) as {
        results?: ScoredMovieJson[];
        error?: string;
        message?: string;
      };
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
          const line = describePickerStateChange(prev, next, {
            actorId: currentUser.id,
            youId: currentUser.id,
          });
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
            lastScoreFingerprint: computePickerScoreFingerprint({
              ...prev,
              scoringInProgress: false,
              scoringError: null,
              scoringResults: list,
            }),
          };
          patchIfRoom(next);
          const line = describePickerStateChange(prev, next, {
            actorId: currentUser.id,
            youId: currentUser.id,
          });
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
        const line = describePickerStateChange(prev, next, {
          actorId: currentUser.id,
          youId: currentUser.id,
        });
        if (line) queueMicrotask(() => appendActivity(line));
        return next;
      });
    }
  };

  const canScore = participants.length > 0 && attractors.length > 0;
  const currentUserId = currentUser.id;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Session header */}
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border bg-card/50 px-4 py-3",
        )}
      >
        {roomId ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              {isPollFallback ? (
                <span
                  className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500 shrink-0"
                  title="Live stream unavailable — updates are polling every ~2.5s"
                >
                  <WifiOff className="h-3.5 w-3.5" />
                  Polling
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500 shrink-0"
                  title="Connected via live stream"
                >
                  <Radio className="h-3.5 w-3.5" />
                  Live
                </span>
              )}
              <p className="text-xs text-muted-foreground truncate">
                Criteria and last ranked list are shared with everyone in this
                room.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={copyShareLink}
            >
              <Link2 className="h-4 w-4" />
              Copy link
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:justify-between">
            <p className="text-xs text-muted-foreground max-w-xl">
              Share one screen: start a room and send the link so everyone can
              edit together in real time.
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

      {/* Who's watching */}
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

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18.5rem] xl:grid-cols-[1fr_20rem] items-start">
        <div className="min-w-0 space-y-6">
          <PickerForm
            roomState={roomState}
            currentUserId={currentUserId}
            hasPlexLinked={hasPlexLinked}
            participantLabel={participantLabel}
            onStateChange={setRoomState}
            onToggleSave={toggleSave}
          />

          <PickerResults
            scoringResults={scoringResults}
            visibleScoringResults={visibleScoringResults}
            scoringInProgress={scoringInProgress}
            scoringError={scoringError}
            emptyScoreHint={emptyScoreHint}
            hasCompletedListRun={hasCompletedListRun}
            canScore={canScore}
            criteriaDirty={criteriaDirty}
            firstRunReady={firstRunReady}
            pickerStatusByTmdb={pickerStatusByTmdb}
            onFindMovies={findMovies}
            onDismiss={dismissResult}
            onUndoDismiss={undoDismiss}
            onPickerStatusesInvalidate={invalidatePickerStatuses}
          />
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <PickerActivity activityLines={activityLines} roomId={roomId} />
        </aside>
      </div>
    </div>
  );
}
