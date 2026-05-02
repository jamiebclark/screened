import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Globe, Lock, Users, Film, Tv, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tmdbImageUrl } from "@/lib/utils";
import { InviteMemberForm } from "./invite-member-form";
import { PrivateListGate } from "./private-list-gate";
import { ListItemActions } from "./list-item-actions";
import { DiscordWebhookForm } from "./discord-webhook-form";
import { LetterboxdImportDialog } from "@/components/letterboxd-import-dialog";
import { EditableListSearchAdd } from "@/components/editable-list-search-add";
import { discordFeatures } from "@/lib/discord";
import { MediaType, WatchStatus } from "@/generated/prisma";

type Params = { params: Promise<{ slug: string }> };

export default async function ListPage({ params }: Params) {
  const { slug } = await params;
  const session = await auth();

  const list = await prisma.list.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      items: {
        include: {
          mediaItem: true,
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!list) notFound();

  const userId = session?.user?.id;
  const isMember = userId
    ? list.members.some((m) => m.userId === userId)
    : false;
  const isOwner = userId === list.ownerId;

  if (!list.isPublic && !isMember) {
    if (!userId) {
      redirect(`/login?callbackUrl=${encodeURIComponent(`/lists/${slug}`)}`);
    }
    const accessRow = await prisma.listAccessRequest.findUnique({
      where: { listId_requesterId: { listId: list.id, requesterId: userId } },
      select: { status: true },
    });
    return (
      <PrivateListGate
        slug={slug}
        listName={list.name}
        initialRequestStatus={accessRow?.status ?? null}
      />
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const radarrUrl = list.isPublic
    ? `${appUrl}/api/lists/${slug}/radarr`
    : `${appUrl}/api/lists/${slug}/radarr?token=${list.radarrToken}`;

  const mediaIds = list.items.map((i) => i.mediaItemId);
  const watchedIdSet =
    userId && mediaIds.length > 0
      ? new Set(
          (
            await prisma.userMediaStatus.findMany({
              where: {
                userId,
                status: WatchStatus.WATCHED,
                mediaItemId: { in: mediaIds },
              },
              select: { mediaItemId: true },
            })
          ).map((r) => r.mediaItemId),
        )
      : new Set<string>();

  const unwatchedItems = userId
    ? list.items.filter((i) => !watchedIdSet.has(i.mediaItemId))
    : list.items;
  const watchedItems = userId
    ? list.items.filter((i) => watchedIdSet.has(i.mediaItemId))
    : [];

  const allMovies = list.items.filter(
    (i) => i.mediaItem.type === MediaType.MOVIE,
  );
  const movies = unwatchedItems.filter(
    (i) => i.mediaItem.type === MediaType.MOVIE,
  );
  const tvShows = unwatchedItems.filter(
    (i) => i.mediaItem.type === MediaType.TV,
  );
  const watchedMovies = watchedItems.filter(
    (i) => i.mediaItem.type === MediaType.MOVIE,
  );
  const watchedTv = watchedItems.filter(
    (i) => i.mediaItem.type === MediaType.TV,
  );

  const existingListKeys = list.items.map(
    (i) =>
      `${i.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}-${i.mediaItem.tmdbId}`,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {list.isPublic ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {list.isPublic ? "Public" : "Private"} list
            </span>
          </div>
          <h1 className="text-3xl font-bold">{list.name}</h1>
          {list.description && (
            <p className="text-muted-foreground mt-1">{list.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex -space-x-2">
              {list.members.slice(0, 5).map((m) => (
                <Avatar
                  key={m.id}
                  className="h-7 w-7 border-2 border-background"
                >
                  <AvatarImage src={m.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {m.user.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5 inline mr-1" />
              {list.members.length} member{list.members.length !== 1 ? "s" : ""}
            </span>
            <span className="text-sm text-muted-foreground">
              {list.items.length} items
            </span>
            {userId && watchedItems.length > 0 && (
              <span className="text-sm text-muted-foreground">
                · {watchedItems.length} in your watched history
              </span>
            )}
          </div>
        </div>

        {isMember && (
          <div className="flex gap-2 shrink-0">
            <LetterboxdImportDialog slug={slug} />
            {isOwner && <InviteMemberForm slug={slug} />}
          </div>
        )}
      </div>

      {isMember && (
        <EditableListSearchAdd
          variant="list"
          listSlug={slug}
          existingKeys={existingListKeys}
        />
      )}

      {/* Radarr URL */}
      {(isMember || isOwner) && allMovies.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 mb-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                <Film className="h-4 w-4 text-primary" />
                Radarr import URL
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Add this URL as a &quot;Custom List&quot; in Radarr to
                auto-import movies from this list.
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all block">
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

      {/* Discord webhook */}
      {isOwner && discordFeatures().bot && (
        <DiscordWebhookForm
          slug={slug}
          connectedChannelName={list.discordChannelName}
          connectedGuildName={list.discordGuildName}
        />
      )}

      {/* Items grid */}
      {list.items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Film className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No items yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {movies.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Film className="h-4 w-4" />
                Movies ({movies.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {movies.map((item) => (
                  <ListItemCard
                    key={item.id}
                    item={item}
                    slug={slug}
                    canDelete={isMember || isOwner}
                    isOwner={isOwner}
                    currentUserId={userId}
                  />
                ))}
              </div>
            </section>
          )}

          {tvShows.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Tv className="h-4 w-4" />
                TV Shows ({tvShows.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tvShows.map((item) => (
                  <ListItemCard
                    key={item.id}
                    item={item}
                    slug={slug}
                    canDelete={isMember || isOwner}
                    isOwner={isOwner}
                    currentUserId={userId}
                  />
                ))}
              </div>
            </section>
          )}

          {userId && (watchedMovies.length > 0 || watchedTv.length > 0) && (
            <section>
              <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
                Watched ({watchedItems.length})
              </h2>
              <div className="space-y-8">
                {watchedMovies.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Film className="h-4 w-4" />
                      Movies ({watchedMovies.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {watchedMovies.map((item) => (
                        <ListItemCard
                          key={item.id}
                          item={item}
                          slug={slug}
                          canDelete={isMember || isOwner}
                          isOwner={isOwner}
                          currentUserId={userId}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {watchedTv.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Tv className="h-4 w-4" />
                      TV Shows ({watchedTv.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {watchedTv.map((item) => (
                        <ListItemCard
                          key={item.id}
                          item={item}
                          slug={slug}
                          canDelete={isMember || isOwner}
                          isOwner={isOwner}
                          currentUserId={userId}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ListItemCard({
  item,
  slug,
  canDelete,
  isOwner,
  currentUserId,
}: {
  item: {
    id: string;
    notes: string | null;
    addedBy: { id: string; name: string | null; avatarUrl: string | null };
    mediaItem: {
      tmdbId: number;
      type: MediaType;
      title: string;
      poster: string | null;
      year: number | null;
      overview: string | null;
    };
  };
  slug: string;
  canDelete: boolean;
  isOwner: boolean;
  currentUserId: string | undefined;
}) {
  const posterUrl = tmdbImageUrl(item.mediaItem.poster, "w342");
  const href = `/${item.mediaItem.type === MediaType.MOVIE ? "movies" : "tv"}/${item.mediaItem.tmdbId}`;

  return (
    <div className="relative rounded-lg border border-border bg-card overflow-hidden group">
      {canDelete && (isOwner || item.addedBy.id === currentUserId) && (
        <ListItemActions itemId={item.id} slug={slug} />
      )}
      <Link
        href={href}
        className="flex gap-3 p-3 hover:bg-accent/30 transition-colors"
      >
        <div className="w-12 shrink-0 aspect-[2/3] rounded overflow-hidden bg-muted">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={item.mediaItem.title}
              width={48}
              height={72}
              className="object-cover w-full h-full"
            />
          ) : null}
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-medium line-clamp-1">
            {item.mediaItem.title}
          </p>
          {item.mediaItem.year && (
            <p className="text-xs text-muted-foreground">
              {item.mediaItem.year}
            </p>
          )}
          {item.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {item.notes}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1.5">
            <Avatar className="h-4 w-4">
              <AvatarFallback className="text-[8px]">
                {item.addedBy.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {item.addedBy.name}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
