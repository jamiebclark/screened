"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EpisodeLogDialog } from "@/components/episode-log-dialog";

interface Episode {
  episode_number: number;
  name: string;
  air_date: string | null;
  runtime: number | null;
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  episodes: Episode[];
}

export type EpisodeStatusRowInput = {
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: string;
  isWatched: boolean;
  review: string | null;
};

type EpisodeRowState = {
  isWatched: boolean;
  watchedAt: string | null;
  review: string | null;
};

function buildEpisodeStatusMap(
  rows: EpisodeStatusRowInput[],
): Map<string, EpisodeRowState> {
  const m = new Map<string, EpisodeRowState>();
  for (const r of rows) {
    m.set(`${r.seasonNumber}x${r.episodeNumber}`, {
      isWatched: r.isWatched,
      watchedAt: r.watchedAt,
      review: r.review,
    });
  }
  return m;
}

function formatWatchedLine(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

interface EpisodeTrackerProps {
  tmdbId: number;
  seasons: Season[];
  episodeStatuses: EpisodeStatusRowInput[];
}

export function EpisodeTracker({
  tmdbId,
  seasons,
  episodeStatuses,
}: EpisodeTrackerProps) {
  const router = useRouter();
  const statusMap = useMemo(
    () => buildEpisodeStatusMap(episodeStatuses),
    [episodeStatuses],
  );
  const [expanded, setExpanded] = useState<number | null>(
    seasons[0]?.season_number ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const [pendingEpisodeUnwatch, setPendingEpisodeUnwatch] = useState<{
    seasonNumber: number;
    episodeNumber: number;
  } | null>(null);
  const [pendingSeasonUnwatch, setPendingSeasonUnwatch] =
    useState<Season | null>(null);

  const getRow = (
    seasonNumber: number,
    episodeNumber: number,
  ): EpisodeRowState => {
    return (
      statusMap.get(`${seasonNumber}x${episodeNumber}`) ?? {
        isWatched: false,
        watchedAt: null,
        review: null,
      }
    );
  };

  const markEpisodeWatched = (seasonNumber: number, episodeNumber: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/media/${tmdbId}/episodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seasonNumber, episodeNumber }),
        });
        if (res.ok) {
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  const runEpisodeUnwatch = (seasonNumber: number, episodeNumber: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/media/${tmdbId}/episodes`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seasonNumber, episodeNumber }),
        });
        if (res.ok) {
          setPendingEpisodeUnwatch(null);
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  const markSeasonWatched = (season: Season) => {
    startTransition(async () => {
      const episodes = season.episodes.map((e) => ({
        seasonNumber: season.season_number,
        episodeNumber: e.episode_number,
      }));

      try {
        const res = await fetch(`/api/media/${tmdbId}/episodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodes }),
        });
        if (res.ok) {
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  const runSeasonUnwatch = (season: Season) => {
    const episodes = season.episodes.map((e) => ({
      seasonNumber: season.season_number,
      episodeNumber: e.episode_number,
    }));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/media/${tmdbId}/episodes`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodes }),
        });
        if (res.ok) {
          setPendingSeasonUnwatch(null);
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  const filteredSeasons = seasons.filter((s) => s.season_number > 0);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Tap an episode number to mark watched. Use{" "}
        <span className="text-foreground">Unmark</span> to remove it from your
        progress without losing the last watched time.
      </p>

      <Dialog
        open={!!pendingEpisodeUnwatch}
        onOpenChange={(o) => !o && setPendingEpisodeUnwatch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unmark this episode?</DialogTitle>
            <DialogDescription>
              It will no longer count toward your progress. If you mark it
              watched again, the previous date is kept unless you change it in
              Log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingEpisodeUnwatch(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!pendingEpisodeUnwatch) return;
                runEpisodeUnwatch(
                  pendingEpisodeUnwatch.seasonNumber,
                  pendingEpisodeUnwatch.episodeNumber,
                );
              }}
            >
              Unmark
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pendingSeasonUnwatch}
        onOpenChange={(o) => !o && setPendingSeasonUnwatch(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Unmark all episodes in {pendingSeasonUnwatch?.name}?
            </DialogTitle>
            <DialogDescription>
              None of them will count as watched until you mark them again.
              Previous watch times are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingSeasonUnwatch(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                if (!pendingSeasonUnwatch) return;
                runSeasonUnwatch(pendingSeasonUnwatch);
              }}
            >
              Unmark season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {filteredSeasons.map((season) => {
        const isExpanded = expanded === season.season_number;
        const seasonWatched = season.episodes.filter(
          (e) => getRow(season.season_number, e.episode_number).isWatched,
        ).length;
        const progress =
          season.episode_count > 0
            ? (seasonWatched / season.episode_count) * 100
            : 0;
        const allWatched =
          seasonWatched === season.episode_count && season.episode_count > 0;

        return (
          <div
            key={season.season_number}
            className="rounded-lg border border-border overflow-hidden"
          >
            <div
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() =>
                setExpanded(isExpanded ? null : season.season_number)
              }
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {season.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {seasonWatched}/{season.episode_count}
                  </span>
                </div>
                <Progress value={progress} className="mt-1.5 h-1" />
              </div>
              <Button
                variant={allWatched ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs shrink-0",
                  allWatched && "text-status-watched",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (allWatched) {
                    setPendingSeasonUnwatch(season);
                  } else {
                    markSeasonWatched(season);
                  }
                }}
                disabled={isPending}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {allWatched ? "Watched" : "Mark all"}
              </Button>
            </div>

            {isExpanded && (
              <div className="border-t border-border divide-y divide-border">
                {season.episodes.map((episode) => {
                  const row = getRow(
                    season.season_number,
                    episode.episode_number,
                  );
                  const isWatched = row.isWatched;
                  const watchedLabel =
                    row.watchedAt != null
                      ? formatWatchedLine(row.watchedAt)
                      : null;
                  return (
                    <div
                      key={episode.episode_number}
                      className={cn(
                        "flex items-start gap-3 px-4 py-2.5 transition-colors",
                        isWatched ? "bg-green-500/5" : "hover:bg-accent/30",
                        !isWatched && "cursor-pointer",
                      )}
                      onClick={() => {
                        if (!isWatched) {
                          markEpisodeWatched(
                            season.season_number,
                            episode.episode_number,
                          );
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {isWatched ? (
                          <div
                            className="flex h-6 items-center gap-1.5 rounded-full border border-green-600/35 bg-green-500/10 pl-2 pr-1.5 text-xs font-medium tabular-nums text-green-800 dark:text-green-300"
                            aria-label={`Episode ${episode.episode_number}, watched`}
                          >
                            <span>{episode.episode_number}</span>
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                              <Check
                                className="h-2.5 w-2.5"
                                strokeWidth={2.5}
                                aria-hidden
                              />
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={cn(
                              "flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-border px-2 text-xs font-medium tabular-nums text-muted-foreground hover:bg-accent",
                            )}
                            aria-label={`Mark episode ${episode.episode_number} watched`}
                            onClick={(e) => {
                              e.stopPropagation();
                              markEpisodeWatched(
                                season.season_number,
                                episode.episode_number,
                              );
                            }}
                          >
                            {episode.episode_number}
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm truncate",
                            isWatched && "text-muted-foreground line-through",
                          )}
                        >
                          {episode.name}
                        </p>
                        {episode.air_date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(episode.air_date).getFullYear()}
                            {episode.runtime ? ` · ${episode.runtime}m` : ""}
                          </p>
                        )}
                        {isWatched && watchedLabel && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Watched {watchedLabel}
                            {row.review ? " · has note" : ""}
                          </p>
                        )}
                        {!isWatched && watchedLabel && (
                          <p className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                            Last watched {watchedLabel} (unmarked)
                          </p>
                        )}
                      </div>
                      <div
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EpisodeLogDialog
                          tmdbId={tmdbId}
                          seasonNumber={season.season_number}
                          episodeNumber={episode.episode_number}
                          episodeTitle={episode.name}
                          initialWatchedAt={row.watchedAt}
                          initialReview={row.review}
                        />
                        {isWatched && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-muted-foreground"
                            onClick={() =>
                              setPendingEpisodeUnwatch({
                                seasonNumber: season.season_number,
                                episodeNumber: episode.episode_number,
                              })
                            }
                          >
                            Unmark
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
