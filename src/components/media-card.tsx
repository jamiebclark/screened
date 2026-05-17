"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Eye,
  Clock,
  Bookmark,
  TvMinimal,
  List,
  Clapperboard,
  Tv,
} from "lucide-react";
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
  priority?: boolean;
  /** Appended as query string, e.g. `watchedDate=2026-04-26`. */
  hrefSearch?: string | null;
  /** When provided, renders as a button instead of a link. */
  onClick?: () => void;
}

const statusIcons = {
  WATCHED: { icon: Eye, label: "Watched", color: "text-status-watched" },
  WATCHING: { icon: Clock, label: "Watching", color: "text-status-watching" },
  WATCHLIST: {
    icon: Bookmark,
    label: "Watchlist",
    color: "text-status-watchlist",
  },
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
  priority = false,
  hrefSearch = null,
  onClick,
}: MediaCardProps) {
  const base = `/${type === "movie" ? "movies" : "tv"}/${tmdbId}`;
  const href = hrefSearch ? `${base}?${hrefSearch}` : base;
  const imageUrl = tmdbImageUrl(poster, "w342");
  const statusInfo = status ? statusIcons[status] : null;

  const posterContent = (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-card border border-border transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-lg group-hover:shadow-primary/10",
          "aspect-[2/3]",
        )}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-muted-foreground text-xs text-center px-2">
              {title}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {(statusInfo || onList) && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {statusInfo && (
              <div
                className={cn("rounded-full bg-black/70 p-1", statusInfo.color)}
                title={statusInfo.label}
              >
                <statusInfo.icon className="h-3.5 w-3.5" />
              </div>
            )}
            {onList && (
              <div
                className="rounded-full bg-black/70 p-1 text-amber-400"
                title="On a list"
              >
                <List className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {type === "movie" ? (
            <span
              className="inline-flex items-center rounded-full bg-black/60 px-1.5 py-0.5 text-violet-400"
              title="Movie"
            >
              <Clapperboard className="h-3 w-3" />
            </span>
          ) : (
            <span
              className="inline-flex items-center rounded-full bg-black/60 px-1.5 py-0.5 text-sky-400"
              title="TV"
            >
              <Tv className="h-3 w-3" />
            </span>
          )}
          {rating && (
            <div className="flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-white">
                {rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs font-medium line-clamp-2">{title}</p>
          {year && <p className="text-white/70 text-xs">{year}</p>}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn("group relative block cursor-pointer", className)}
      >
        {posterContent}
      </div>
    );
  }

  return (
    <Link href={href} className={cn("group relative block", className)}>
      {posterContent}
    </Link>
  );
}
