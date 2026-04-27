import Link from "next/link";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/utils";
import { Film, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MediaType } from "@/generated/prisma";

export type HistoryRowEntry = {
  id: string;
  watchedAt: Date;
  mediaItem: {
    tmdbId: number;
    type: MediaType;
    title: string;
    poster: string | null;
    year: number | null;
  };
  seasonNumber?: number;
  episodeNumber?: number;
};

export function HistoryWatchEntryRow({
  entry,
  timeLabel,
}: {
  entry: HistoryRowEntry;
  timeLabel?: string;
}) {
  const href =
    entry.mediaItem.type === MediaType.MOVIE
      ? `/movies/${entry.mediaItem.tmdbId}`
      : `/tv/${entry.mediaItem.tmdbId}`;
  const poster = tmdbImageUrl(entry.mediaItem.poster, "w92");
  const isMovie = entry.mediaItem.type === MediaType.MOVIE;
  const epLabel =
    !isMovie && entry.seasonNumber != null && entry.episodeNumber != null ? (
      <span className="text-xs text-muted-foreground tabular-nums">
        S{entry.seasonNumber}E{entry.episodeNumber}
      </span>
    ) : null;

  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors p-3 group"
    >
      <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
        {poster ? (
          <Image
            src={poster}
            alt={entry.mediaItem.title}
            width={40}
            height={56}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {isMovie ? (
              <Film className="h-4 w-4" />
            ) : (
              <Tv className="h-4 w-4" />
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate group-hover:text-primary transition-colors">
          {entry.mediaItem.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {isMovie ? "Movie" : epLabel ? "Episode" : "TV"}
          </Badge>
          {epLabel}
          {entry.mediaItem.year != null && (
            <span className="text-xs text-muted-foreground">
              {entry.mediaItem.year}
            </span>
          )}
        </div>
      </div>

      {timeLabel != null && (
        <time className="text-xs text-muted-foreground shrink-0">
          {timeLabel}
        </time>
      )}
    </Link>
  );
}
