import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaCard } from "@/components/media-card";
import { Bookmark } from "lucide-react";
import { MediaType } from "@/generated/prisma";

export default async function WatchlistPage() {
  const session = await auth();

  const items = await prisma.userMediaStatus.findMany({
    where: { userId: session!.user.id, status: "WATCHLIST" },
    include: { mediaItem: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2 text-blue-400">
          <Bookmark className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-sm text-muted-foreground">{items.length} title{items.length !== 1 ? "s" : ""} saved</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Your watchlist is empty</p>
          <p className="text-sm text-muted-foreground">Bookmark movies and shows to watch later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              tmdbId={item.mediaItem.tmdbId}
              type={item.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}
              title={item.mediaItem.title}
              poster={item.mediaItem.poster}
              year={item.mediaItem.year}
              status={item.status}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
