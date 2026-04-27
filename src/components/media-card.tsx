"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Eye, Clock, Bookmark, TvMinimal, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, tmdbImageUrl } from "@/lib/utils";

interface MediaCardProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  poster: string | null;
  year: number | null;
  rating?: number | null;
  status?: "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED" | null;
  /** Shown when the title is on a list you belong to; can appear alongside `status`. */
  onList?: boolean;
  className?: string;
  compact?: boolean;
  /** Appended as query string, e.g. `watchedDate=2026-04-26`. */
  hrefSearch?: string | null;
}

const statusIcons = {
  WATCHED: { icon: Eye, label: "Watched", color: "text-status-watched" },
  WATCHING: { icon: Clock, label: "Watching", color: "text-status-watching" },
  WATCHLIST: { icon: Bookmark, label: "Watchlist", color: "text-status-watchlist" },
  DROPPED: {
    icon: TvMinimal,
    label: "Dropped",
    color: "text-status-dropped",
  },
};

export function MediaCard({
  tmdbId,
  type,
  title,
  poster,
  year,
  rating,
  status,
  onList = false,
  className,
  compact = false,
  hrefSearch = null,
}: MediaCardProps) {
  const base = `/${type === "movie" ? "movies" : "tv"}/${tmdbId}`;
  const href = hrefSearch ? `${base}?${hrefSearch}` : base;
  const imageUrl = tmdbImageUrl(poster, "w342");
  const statusInfo = status ? statusIcons[status] : null;
  const showListBadge = onList;

  return (
    <Link href={href} className={cn("group relative block", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-card border border-border transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-lg group-hover:shadow-primary/10",
          compact ? "aspect-[2/3]" : "aspect-[2/3]",
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-muted-foreground text-xs text-center px-2">
              {title}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {(statusInfo || showListBadge) && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {statusInfo && (
              <div
                className={cn("rounded-full bg-black/70 p-1", statusInfo.color)}
                title={statusInfo.label}
              >
                <statusInfo.icon className="h-3.5 w-3.5" />
              </div>
            )}
            {showListBadge && (
              <div
                className="rounded-full bg-black/70 p-1 text-amber-400"
                title="On a list"
              >
                <List className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        )}

        {rating && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-white">
              {rating.toFixed(1)}
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs font-medium line-clamp-2">{title}</p>
          {year && <p className="text-white/70 text-xs">{year}</p>}
        </div>
      </div>

      {!compact && (
        <div className="mt-2 space-y-0.5">
          <p className="text-sm font-medium line-clamp-1">{title}</p>
          <div className="flex items-center gap-2">
            {year && (
              <span className="text-xs text-muted-foreground">{year}</span>
            )}
            <Badge variant="outline" className="text-2xs px-1 py-0">
              {type === "movie" ? "Movie" : "TV"}
            </Badge>
          </div>
        </div>
      )}
    </Link>
  );
}
