"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

interface EpisodeTrackerProps {
  tmdbId: number;
  seasons: Season[];
  watchedEpisodes: { seasonNumber: number; episodeNumber: number }[];
}

export function EpisodeTracker({
  tmdbId,
  seasons,
  watchedEpisodes,
}: EpisodeTrackerProps) {
  const [watched, setWatched] = useState(
    new Set(watchedEpisodes.map((e) => `${e.seasonNumber}x${e.episodeNumber}`)),
  );
  const [expanded, setExpanded] = useState<number | null>(
    seasons[0]?.season_number ?? null,
  );
  const [isPending, startTransition] = useTransition();

  const toggleEpisode = (seasonNumber: number, episodeNumber: number) => {
    const key = `${seasonNumber}x${episodeNumber}`;
    const isWatched = watched.has(key);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/media/${tmdbId}/episodes`, {
          method: isWatched ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seasonNumber, episodeNumber }),
        });
        if (res.ok) {
          setWatched((prev) => {
            const next = new Set(prev);
            if (isWatched) next.delete(key);
            else next.add(key);
            return next;
          });
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

      const allWatched = episodes.every((e) =>
        watched.has(`${e.seasonNumber}x${e.episodeNumber}`),
      );

      try {
        const res = await fetch(`/api/media/${tmdbId}/episodes`, {
          method: allWatched ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodes }),
        });
        if (res.ok) {
          setWatched((prev) => {
            const next = new Set(prev);
            episodes.forEach(({ seasonNumber, episodeNumber }) => {
              const key = `${seasonNumber}x${episodeNumber}`;
              if (allWatched) next.delete(key);
              else next.add(key);
            });
            return next;
          });
        }
      } catch {
        // ignore
      }
    });
  };

  const filteredSeasons = seasons.filter((s) => s.season_number > 0);

  return (
    <div className="space-y-2">
      {filteredSeasons.map((season) => {
        const isExpanded = expanded === season.season_number;
        const seasonWatched = season.episodes.filter((e) =>
          watched.has(`${season.season_number}x${e.episode_number}`),
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
                  allWatched && "text-green-400",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  markSeasonWatched(season);
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
                  const key = `${season.season_number}x${episode.episode_number}`;
                  const isWatched = watched.has(key);
                  return (
                    <div
                      key={episode.episode_number}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                        isWatched ? "bg-green-500/5" : "hover:bg-accent/30",
                      )}
                      onClick={() =>
                        toggleEpisode(
                          season.season_number,
                          episode.episode_number,
                        )
                      }
                    >
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs",
                          isWatched
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {isWatched ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          episode.episode_number
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
