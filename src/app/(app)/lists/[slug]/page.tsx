import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Film } from "lucide-react";
import { PrivateListGate } from "./private-list-gate";
import { ListPageHeader } from "./list-page-header";
import { ListSortControls, type SortField } from "./list-sort-controls";
import { ListItemsGrid, type GridItem } from "./list-items-grid";
import { ListItemReorder } from "./list-item-reorder";
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ListPageHeader
        listSlug={slug}
        isOwner={isOwner}
        isMember={isMember}
        isPublic={list.isPublic}
        name={list.name}
        description={list.description ?? null}
        memberCount={list.members.length}
        itemCount={list.items.length}
        watchedCount={userId ? watchedItems.length : 0}
        memberAvatars={list.members.slice(0, 5).map((m) => ({
          id: m.id,
          name: m.user.name,
          avatarUrl: m.user.avatarUrl,
        }))}
        existingKeys={existingListKeys}
        rankingEnabled={list.rankingEnabled}
        votingEnabled={list.votingEnabled}
        commentsEnabled={list.commentsEnabled}
        displayMode={list.displayMode}
        itemCap={list.itemCap}
        members={list.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: {
            id: m.user.id,
            name: m.user.name,
            avatarUrl: m.user.avatarUrl,
            status: m.user.status,
          },
        }))}
        radarrUrl={radarrUrl}
        discordEnabled={discordFeatures().bot}
        connectedChannelName={list.discordChannelName}
        connectedGuildName={list.discordGuildName}
      />

      {/* Main content */}
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
  );
}
