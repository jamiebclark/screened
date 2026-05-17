import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { Eye, Film, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMyWatchHistoryRecent } from "@/lib/watch-history-queries";
import type { WatchHistoryListItem } from "@/lib/watch-history-queries";
import {
  historyDayPath,
  historyMonthPath,
  localCalendarParts,
} from "@/lib/history-calendar";
import { WatchingTabs } from "@/components/watching-tabs";
import { MediaType } from "@/generated/prisma";
import { tmdbImageUrl } from "@/lib/utils";

function formatGroupDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  if (diffDays < 365)
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type TitleGroup = {
  tmdbId: number;
  mediaItem: WatchHistoryListItem["mediaItem"];
  count: number;
  latestAt: Date;
  firstSeason?: number;
  firstEpisode?: number;
};

function groupByTitle(items: WatchHistoryListItem[]): TitleGroup[] {
  const map = new Map<number, TitleGroup>();
  for (const item of items) {
    const key = item.mediaItem.tmdbId;
    if (map.has(key)) {
      map.get(key)!.count++;
    } else {
      map.set(key, {
        tmdbId: item.mediaItem.tmdbId,
        mediaItem: item.mediaItem,
        count: 1,
        latestAt: item.watchedAt,
        firstSeason: item.seasonNumber,
        firstEpisode: item.episodeNumber,
      });
    }
  }
  return Array.from(map.values());
}

function HistoryPosterCard({ group }: { group: TitleGroup }) {
  const isMovie = group.mediaItem.type === MediaType.MOVIE;
  const href = isMovie
    ? `/movies/${group.mediaItem.tmdbId}`
    : `/tv/${group.mediaItem.tmdbId}`;
  const poster = tmdbImageUrl(group.mediaItem.poster, "w185");

  let subLabel: string;
  if (isMovie) {
    subLabel = formatTime(group.latestAt);
  } else if (
    group.count === 1 &&
    group.firstSeason != null &&
    group.firstEpisode != null
  ) {
    subLabel = `S${group.firstSeason}E${group.firstEpisode}`;
  } else {
    subLabel = `${group.count} ep${group.count !== 1 ? "s" : ""}`;
  }

  return (
    <Link
      href={href}
      className="group relative block rounded-lg overflow-hidden aspect-[2/3] bg-zinc-900"
    >
      {poster ? (
        <Image
          src={poster}
          alt={group.mediaItem.title}
          fill
          sizes="(max-width: 640px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
          {isMovie ? (
            <Film className="h-6 w-6 text-zinc-600" />
          ) : (
            <Tv className="h-6 w-6 text-zinc-600" />
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-2.5 pb-2.5 pt-12">
        <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
          {group.mediaItem.title}
        </p>
        <p className="text-[10px] text-white/55 mt-0.5 tabular-nums">
          {subLabel}
        </p>
        {!isMovie && group.count > 1 && (
          <p className="text-[10px] text-white/35 tabular-nums">
            {formatTime(group.latestAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

export const metadata: Metadata = { title: "Watch history" };

export default async function HistoryPage() {
  const session = await auth();

  const watched = await fetchMyWatchHistoryRecent(session!.user.id, 200);

  const groups: { label: string; date: Date; items: typeof watched }[] = [];

  for (const entry of watched) {
    const date = entry.watchedAt;
    const label = formatGroupDate(date);
    const last = groups[groups.length - 1];

    if (last && last.label === label) {
      last.items.push(entry);
    } else {
      groups.push({ label, date, items: [entry] });
    }
  }

  const now = new Date();
  const { year: cy, month: cm } = localCalendarParts(now);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <WatchingTabs />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Watch History</h1>
          <p className="text-base text-muted-foreground">
            {watched.length} viewing{watched.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link
            href={historyMonthPath(cy, cm)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Calendar ·{" "}
            {new Date(cy, cm - 1, 1).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </Link>
          <Link
            href="/settings/watch-history"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Manage imports & clear history
          </Link>
        </div>
      </div>

      {watched.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground max-w-sm mx-auto">
          <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground">No watch history yet</p>
          <p className="text-sm mt-2 leading-relaxed">
            Connect Plex or import from Letterboxd to pull in your existing
            history, or log a viewing manually on any movie or TV page.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-5">
            <Button variant="default" size="sm" asChild>
              <Link href="/settings/plex">Connect Plex</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/letterboxd">Import Letterboxd</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const { year, month, day } = localCalendarParts(group.date);
            const dayHref = historyDayPath(year, month, day);
            const titleGroups = groupByTitle(group.items);
            return (
              <div key={`${group.label}-${group.date.toISOString()}`}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 sticky top-16 bg-background/95 backdrop-blur py-1 -mx-4 px-4">
                  <Link
                    href={dayHref}
                    className="hover:text-foreground transition-colors"
                  >
                    {group.label}
                  </Link>
                </h2>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {titleGroups.map((tg) => (
                    <HistoryPosterCard key={tg.tmdbId} group={tg} />
                  ))}
                </div>
              </div>
            );
          })}

          {watched.length === 200 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Showing your 200 most recent. Older history is still tracked —
              open a month on the calendar to browse by date.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
