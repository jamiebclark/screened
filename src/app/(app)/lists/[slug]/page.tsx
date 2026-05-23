import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Globe, Lock, Users, Film, Download, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteMemberForm } from "./invite-member-form";
import { PrivateListGate } from "./private-list-gate";
import { DiscordWebhookForm } from "./discord-webhook-form";
import { LetterboxdImportDialog } from "@/components/letterboxd-import-dialog";
import { ListAddFab } from "./list-add-fab";
import { CopyButton } from "@/components/copy-button";
import { ListSortControls, type SortField } from "./list-sort-controls";
import { ListItemsGrid, type GridItem } from "./list-items-grid";
import { ListItemReorder } from "./list-item-reorder";
import { ListSettingsPanel } from "./list-settings-panel";
import { discordFeatures } from "@/lib/discord";
import { computeUnreadCommentCount } from "@/lib/comment-utils";
import { MediaType, WatchStatus } from "@/generated/prisma";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const list = await prisma.list.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: list ? `${list.name}` : "List" };
}

const VALID_SORTS: SortField[] = ["date_added", "title", "votes", "release"];

function parseSort(raw: string | undefined, votingEnabled: boolean): SortField {
  if (raw === "votes" && !votingEnabled) return "date_added";
  return VALID_SORTS.includes(raw as SortField)
    ? (raw as SortField)
    : "date_added";
}

type RawItem = {
  id: string;
  notes: string | null;
  noteIsSpoiler: boolean;
  position: number | null;
  addedAt: Date;
  mediaItemId: string;
  addedBy: { id: string; name: string | null; avatarUrl: string | null };
  mediaItem: {
    tmdbId: number;
    type: MediaType;
    title: string;
    poster: string | null;
    year: number | null;
    overview: string | null;
    runtime: number | null;
    genres: string[];
  };
  votes: { value: number; userId: string }[];
  comments: { id: string; createdAt: Date }[];
};

function sortItems(items: RawItem[], sort: SortField): RawItem[] {
  return [...items].sort((a, b) => {
    switch (sort) {
      case "title":
        return a.mediaItem.title.localeCompare(b.mediaItem.title);
      case "votes": {
        const scoreA = a.votes.reduce((s, v) => s + v.value, 0);
        const scoreB = b.votes.reduce((s, v) => s + v.value, 0);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.addedAt.getTime() - a.addedAt.getTime();
      }
      case "release": {
        const diff = (b.mediaItem.year ?? 0) - (a.mediaItem.year ?? 0);
        if (diff !== 0) return diff;
        return a.mediaItem.title.localeCompare(b.mediaItem.title);
      }
      default:
        return b.addedAt.getTime() - a.addedAt.getTime();
    }
  });
}

function toGridItem(
  item: RawItem,
  canDelete: boolean,
  watchedBy: { id: string; name: string | null; avatarUrl: string | null }[],
  watchingBy: { id: string; name: string | null; avatarUrl: string | null }[],
  lastReadAt: Date | null,
): GridItem {
  const commentCount = item.comments.length;
  const unreadCommentCount = computeUnreadCommentCount(
    item.comments,
    lastReadAt,
  );

  return {
    id: item.id,
    notes: item.notes,
    noteIsSpoiler: item.noteIsSpoiler,
    position: item.position,
    addedAt: item.addedAt.toISOString(),
    canDelete,
    commentCount,
    unreadCommentCount,
    addedBy: item.addedBy,
    mediaItem: {
      tmdbId: item.mediaItem.tmdbId,
      type: item.mediaItem.type === MediaType.MOVIE ? "movie" : "tv",
      title: item.mediaItem.title,
      poster: item.mediaItem.poster,
      year: item.mediaItem.year,
      overview: item.mediaItem.overview,
      runtime: item.mediaItem.runtime,
      genres: item.mediaItem.genres,
    },
    votes: item.votes,
    watchedBy,
    watchingBy,
  };
}

export default async function ListPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { sort: rawSort } = await searchParams;

  const session = await auth();

  const list = await prisma.list.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true, status: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      items: {
        include: {
          mediaItem: true,
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
          votes: { select: { value: true, userId: true } },
          comments: { select: { id: true, createdAt: true } },
        },
        orderBy: [{ position: "asc" }, { addedAt: "desc" }],
      },
    },
  });

  if (!list) notFound();

  const userId = session?.user?.id;
  const memberRecord = userId
    ? list.members.find((m) => m.userId === userId)
    : null;
  const isMember = memberRecord !== null && memberRecord !== undefined;
  const isOwner = userId === list.ownerId;
  const isContributor =
    isOwner ||
    memberRecord?.role === "OWNER" ||
    memberRecord?.role === "CONTRIBUTOR";

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

  const sort = parseSort(rawSort, list.votingEnabled);
  const sortedItems = list.rankingEnabled
    ? list.items
    : sortItems(list.items, sort);
  const mediaIds = sortedItems.map((i) => i.mediaItemId);

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
    ? sortedItems.filter((i) => !watchedIdSet.has(i.mediaItemId))
    : sortedItems;
  const watchedItems = userId
    ? sortedItems.filter((i) => watchedIdSet.has(i.mediaItemId))
    : [];

  const memberUserIds = list.members.map((m) => m.userId);
  const memberStatuses =
    mediaIds.length > 0 && memberUserIds.length > 0
      ? await prisma.userMediaStatus.findMany({
          where: {
            userId: { in: memberUserIds },
            mediaItemId: { in: mediaIds },
            status: { in: [WatchStatus.WATCHED, WatchStatus.WATCHING] },
          },
          select: { userId: true, mediaItemId: true, status: true },
        })
      : [];

  const memberById = new Map<
    string,
    { id: string; name: string | null; avatarUrl: string | null }
  >(list.members.map((m) => [m.userId, m.user]));

  const watchedByMap = new Map<
    string,
    { id: string; name: string | null; avatarUrl: string | null }[]
  >();
  const watchingByMap = new Map<
    string,
    { id: string; name: string | null; avatarUrl: string | null }[]
  >();
  for (const s of memberStatuses) {
    const user = memberById.get(s.userId);
    if (!user) continue;
    if (s.status === WatchStatus.WATCHED) {
      const arr = watchedByMap.get(s.mediaItemId) ?? [];
      arr.push(user);
      watchedByMap.set(s.mediaItemId, arr);
    } else {
      const arr = watchingByMap.get(s.mediaItemId) ?? [];
      arr.push(user);
      watchingByMap.set(s.mediaItemId, arr);
    }
  }

  const itemIds = list.items.map((i) => i.id);
  const commentReadMap =
    userId && itemIds.length > 0
      ? new Map(
          (
            await prisma.listItemCommentRead.findMany({
              where: { userId, listItemId: { in: itemIds } },
              select: { listItemId: true, lastReadAt: true },
            })
          ).map((r) => [r.listItemId, r.lastReadAt]),
        )
      : new Map<string, Date>();

  const canDelete = isMember || isOwner;
  const canVote = (isMember || isOwner) && list.votingEnabled;
  const canReorder = list.rankingEnabled && isContributor;

  function makeGridItems(items: RawItem[]): GridItem[] {
    return items.map((item) =>
      toGridItem(
        item,
        canDelete && (isOwner || item.addedBy.id === userId),
        watchedByMap.get(item.mediaItemId) ?? [],
        watchingByMap.get(item.mediaItemId) ?? [],
        userId ? (commentReadMap.get(item.id) ?? null) : null,
      ),
    );
  }

  const movies = makeGridItems(
    unwatchedItems.filter((i) => i.mediaItem.type === MediaType.MOVIE),
  );
  const tvShows = makeGridItems(
    unwatchedItems.filter((i) => i.mediaItem.type === MediaType.TV),
  );
  const watchedMovies = makeGridItems(
    watchedItems.filter((i) => i.mediaItem.type === MediaType.MOVIE),
  );
  const watchedTv = makeGridItems(
    watchedItems.filter((i) => i.mediaItem.type === MediaType.TV),
  );

  const existingListKeys = list.items.map(
    (i) =>
      `${i.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}-${i.mediaItem.tmdbId}`,
  );

  const hasSidebar = isMember || isOwner;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
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
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {list.items.length > 0 && !list.rankingEnabled && (
            <ListSortControls
              currentSort={sort}
              showVoteSort={list.votingEnabled}
            />
          )}

          {list.items.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Film className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No items yet</p>
            </div>
          ) : list.displayMode === "LIST" ? (
            <ListItemReorder
              items={[...movies, ...tvShows, ...watchedMovies, ...watchedTv]}
              listSlug={slug}
              canVote={canVote}
              votingEnabled={list.votingEnabled}
              commentsEnabled={list.commentsEnabled}
              currentUserId={userId}
              rankingEnabled={list.rankingEnabled}
              canReorder={canReorder}
              isListOwner={isOwner}
            />
          ) : (
            <ListItemsGrid
              movies={movies}
              tvShows={tvShows}
              watchedMovies={watchedMovies}
              watchedTv={watchedTv}
              listSlug={slug}
              canVote={canVote}
              votingEnabled={list.votingEnabled}
              commentsEnabled={list.commentsEnabled}
              currentUserId={userId}
              isListOwner={isOwner}
            />
          )}
        </div>

        {/* Sidebar — integrations */}
        {hasSidebar && (
          <div className="lg:w-72 shrink-0 space-y-4">
            {isOwner && (
              <ListSettingsPanel
                listSlug={slug}
                rankingEnabled={list.rankingEnabled}
                votingEnabled={list.votingEnabled}
                commentsEnabled={list.commentsEnabled}
                displayMode={list.displayMode}
                itemCap={list.itemCap}
              />
            )}
            {isOwner && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Members
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Invite collaborators to this list.
                </p>
                <InviteMemberForm slug={slug} />
                {list.members.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                    {list.members.map((m) => {
                      const isInvited = m.user.status === "INVITED";
                      return (
                        <li
                          key={m.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Avatar className="h-5 w-5 shrink-0">
                            <AvatarImage src={m.user.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[9px]">
                              {m.user.name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isInvited ? (
                            <span className="flex-1 truncate text-xs text-muted-foreground">
                              {m.user.name}
                            </span>
                          ) : (
                            <Link
                              href={`/profile/${m.user.id}`}
                              className="flex-1 truncate text-xs hover:underline"
                            >
                              {m.user.name}
                            </Link>
                          )}
                          {isInvited ? (
                            <span className="text-[10px] font-medium text-amber-600 shrink-0">
                              pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground capitalize shrink-0">
                              {m.role.toLowerCase()}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
            {isMember && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Download className="h-4 w-4 text-primary" />
                  Letterboxd
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Import films from your Letterboxd watchlist.
                </p>
                <LetterboxdImportDialog slug={slug} />
              </div>
            )}
            {isOwner && discordFeatures().bot && (
              <DiscordWebhookForm
                slug={slug}
                connectedChannelName={list.discordChannelName}
                connectedGuildName={list.discordGuildName}
              />
            )}
            {(isMember || isOwner) && (
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Film className="h-4 w-4 text-primary" />
                  Radarr import URL
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Add this URL as a &quot;Custom List&quot; in Radarr to
                  auto-import movies from this list.
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all block flex-1 min-w-0">
                    {radarrUrl}
                  </code>
                  <CopyButton text={radarrUrl} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isMember && (
        <ListAddFab listSlug={slug} existingKeys={existingListKeys} />
      )}
    </div>
  );
}
