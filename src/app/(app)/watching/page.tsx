import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MediaCard } from "@/components/media-card";
import { ClearTrackingCornerButton } from "@/components/clear-tracking-corner-button";
import { EditableListSearchAdd } from "@/components/editable-list-search-add";
import { Button } from "@/components/ui/button";
import {
  buildLastWatchedMsByMediaItemId,
  sortByLastWatchedDesc,
} from "@/lib/user-media-sort";
import { Clock } from "lucide-react";
import { MediaType } from "@/generated/prisma";

export default async function WatchingPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [rows, watchAgg, episodeAgg] = await Promise.all([
    prisma.userMediaStatus.findMany({
      where: { userId, status: "WATCHING" },
      include: { mediaItem: true },
    }),
    prisma.watchEntry.groupBy({
      by: ["mediaItemId"],
      where: { userId },
      _max: { watchedAt: true },
    }),
    prisma.episodeStatus.groupBy({
      by: ["mediaItemId"],
      where: { userId, isWatched: true },
      _max: { watchedAt: true },
    }),
  ]);

  const lastWatchedMs = buildLastWatchedMsByMediaItemId(watchAgg, episodeAgg);
  const items = sortByLastWatchedDesc(rows, lastWatchedMs);

  const existingKeys = items.map(
    (i) =>
      `${i.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}-${i.mediaItem.tmdbId}`,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2 text-status-watching">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Watching</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} title{items.length !== 1 ? "s" : ""} in progress
          </p>
        </div>
      </div>

      <EditableListSearchAdd variant="watching" existingKeys={existingKeys} />

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl max-w-sm mx-auto">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nothing in progress</p>
          <p className="text-sm text-muted-foreground mb-5">
            Search for something to start watching.
          </p>
          <Button size="sm" asChild>
            <Link href="/search">Search titles</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {items.map((item) => {
            const type =
              item.mediaItem.type === MediaType.MOVIE ? "movie" : "tv";
            return (
              <div key={item.id} className="relative">
                <ClearTrackingCornerButton
                  tmdbId={item.mediaItem.tmdbId}
                  type={type}
                  position="top-left"
                  title="Remove from watching"
                  ariaLabel="Remove from watching"
                />
                <MediaCard
                  tmdbId={item.mediaItem.tmdbId}
                  type={type}
                  title={item.mediaItem.title}
                  poster={item.mediaItem.poster}
                  year={item.mediaItem.year}
                  status={item.status}
                  compact
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
