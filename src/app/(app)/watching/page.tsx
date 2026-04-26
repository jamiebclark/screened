import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaCard } from "@/components/media-card";
import { EditableListSearchAdd } from "@/components/editable-list-search-add";
import { Clock } from "lucide-react";
import { MediaType } from "@/generated/prisma";

export default async function WatchingPage() {
  const session = await auth();

  const items = await prisma.userMediaStatus.findMany({
    where: { userId: session!.user.id, status: "WATCHING" },
    include: { mediaItem: true },
    orderBy: { updatedAt: "desc" },
  });

  const existingKeys = items.map(
    (i) => `${i.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}-${i.mediaItem.tmdbId}`
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2 text-yellow-400">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Watching</h1>
          <p className="text-sm text-muted-foreground">{items.length} title{items.length !== 1 ? "s" : ""} in progress</p>
        </div>
      </div>

      <EditableListSearchAdd variant="watching" existingKeys={existingKeys} />

      {items.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nothing in progress</p>
          <p className="text-sm text-muted-foreground">Mark something as watching to see it here.</p>
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
