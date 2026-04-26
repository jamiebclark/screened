import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaCard } from "@/components/media-card";
import { EditableListSearchAdd } from "@/components/editable-list-search-add";
import { Bookmark, Film, ExternalLink } from "lucide-react";
import { MediaType } from "@/generated/prisma";
import { ensureWatchlistRadarrToken } from "@/lib/ensure-watchlist-radarr-token";

export default async function WatchlistPage() {
  const session = await auth();

  const items = await prisma.userMediaStatus.findMany({
    where: { userId: session!.user.id, status: "WATCHLIST" },
    include: { mediaItem: true },
    orderBy: { updatedAt: "desc" },
  });

  const movies = items.filter((i) => i.mediaItem.type === MediaType.MOVIE);
  const radarrToken =
    movies.length > 0 ? await ensureWatchlistRadarrToken(session!.user.id) : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const radarrUrl = radarrToken
    ? `${appUrl}/api/user/radarr/watchlist?token=${radarrToken}`
    : null;

  const existingKeys = items.map(
    (i) => `${i.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}-${i.mediaItem.tmdbId}`
  );

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

      <EditableListSearchAdd variant="watchlist" existingKeys={existingKeys} />

      {movies.length > 0 && radarrUrl && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                <Film className="h-4 w-4 text-primary" />
                Radarr import URL
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Add this URL as a &quot;Custom List&quot; in Radarr to auto-import movies from your
                watchlist.
              </p>
              <code
                className="text-xs bg-muted px-2 py-1 rounded font-mono break-all block"
                data-testid="watchlist-radarr-url"
              >
                {radarrUrl}
              </code>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href={radarrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-transparent hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

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
