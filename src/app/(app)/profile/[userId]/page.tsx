import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Eye, Clock, Bookmark, Star, Lock } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaType, WatchStatus, Prisma } from "@/generated/prisma";
import { canViewProfileContent } from "@/lib/profile-visibility";
import {
  areFriends,
  countMutualFriends,
  getProfileFriendState,
} from "@/lib/friendship";
import {
  ProfileFriendActions,
  type ProfileFriendStateJson,
} from "@/components/profile-friend-actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  buildLastWatchedMsByMediaItemId,
  sortByLastWatchedDesc,
} from "@/lib/user-media-sort";

function posterUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

type Params = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return { title: user?.name ? `${user.name}` : "Profile" };
}

function toFriendJson(
  s: Awaited<ReturnType<typeof getProfileFriendState>>,
): ProfileFriendStateJson {
  if (s.kind === "outgoing" || s.kind === "incoming") {
    return { kind: s.kind, requestId: s.requestId };
  }
  return { kind: s.kind };
}

function buildVisibleStatusFilter(
  canHistory: boolean,
  canList: boolean,
): WatchStatus[] {
  const out: WatchStatus[] = [];
  if (canHistory) {
    out.push("WATCHED", "WATCHING");
  }
  if (canList) {
    out.push("WATCHLIST");
  }
  return out;
}

/** No `UserMediaStatus` id will match; used to load zero rows when nothing is shared. */
const NO_MATCH_USER_MEDIA_STATUS = "c00000000000000000000000";

export default async function ProfilePage({ params }: Params) {
  const { userId } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  if (!viewerId) notFound();

  const isOwnProfile = viewerId === userId;

  const [user, isFriend, friendState, mutualCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        watchlistVisibility: true,
        watchHistoryVisibility: true,
      },
    }),
    isOwnProfile ? true : areFriends(viewerId, userId),
    getProfileFriendState(viewerId, userId),
    isOwnProfile ? 0 : countMutualFriends(viewerId, userId),
  ]);

  if (!user) notFound();

  const canSeeWatchlist = canViewProfileContent({
    isOwner: isOwnProfile,
    visibility: user.watchlistVisibility,
    isFriend,
  });
  const canSeeHistory = canViewProfileContent({
    isOwner: isOwnProfile,
    visibility: user.watchHistoryVisibility,
    isFriend,
  });

  const statusFilter = isOwnProfile
    ? null
    : buildVisibleStatusFilter(canSeeHistory, canSeeWatchlist);
  const hasNoVisibleStatuses =
    !isOwnProfile && (statusFilter?.length ?? 0) === 0;

  const mediaWhere: Prisma.UserMediaStatusWhereInput = isOwnProfile
    ? { userId }
    : hasNoVisibleStatuses
      ? { id: NO_MATCH_USER_MEDIA_STATUS }
      : { userId, status: { in: statusFilter! } };

  const [mediaStatuses, watchAgg, episodeAgg] = await Promise.all([
    prisma.userMediaStatus.findMany({
      where: mediaWhere,
      orderBy: { updatedAt: "desc" },
      include: { mediaItem: true },
    }),
    canSeeHistory
      ? prisma.watchEntry.groupBy({
          by: ["mediaItemId"],
          where: { userId },
          _max: { watchedAt: true },
        })
      : Promise.resolve(
          [] as { mediaItemId: string; _max: { watchedAt: Date | null } }[],
        ),
    canSeeHistory
      ? prisma.episodeStatus.groupBy({
          by: ["mediaItemId"],
          where: { userId, isWatched: true },
          _max: { watchedAt: true },
        })
      : Promise.resolve(
          [] as { mediaItemId: string; _max: { watchedAt: Date | null } }[],
        ),
  ]);

  const countWhere = (statuses: WatchStatus[]) => ({
    userId,
    status: { in: statuses },
  });

  const [hiddenWatched, hiddenWatching, hiddenList, hasAnyHiddenRating] =
    isOwnProfile
      ? [0, 0, 0, false]
      : await Promise.all([
          canSeeHistory
            ? 0
            : prisma.userMediaStatus.count({ where: countWhere(["WATCHED"]) }),
          canSeeHistory
            ? 0
            : prisma.userMediaStatus.count({ where: countWhere(["WATCHING"]) }),
          canSeeWatchlist
            ? 0
            : prisma.userMediaStatus.count({
                where: countWhere(["WATCHLIST"]),
              }),
          canSeeHistory
            ? false
            : prisma.userMediaStatus
                .findFirst({ where: { userId, rating: { not: null } } })
                .then((r) => r != null),
        ]);

  const lastWatchedMs = canSeeHistory
    ? buildLastWatchedMsByMediaItemId(watchAgg, episodeAgg)
    : new Map<string, number>();

  const recentEntries = canSeeHistory
    ? await prisma.watchEntry.findMany({
        where: { userId },
        orderBy: { watchedAt: "desc" },
        take: 5,
        include: {
          mediaItem: {
            select: {
              tmdbId: true,
              type: true,
              title: true,
              poster: true,
              year: true,
            },
          },
        },
      })
    : [];

  const watched = canSeeHistory
    ? sortByLastWatchedDesc(
        mediaStatuses.filter((s) => s.status === "WATCHED"),
        lastWatchedMs,
      )
    : [];
  const watching = canSeeHistory
    ? sortByLastWatchedDesc(
        mediaStatuses.filter((s) => s.status === "WATCHING"),
        lastWatchedMs,
      )
    : [];
  const watchlist = canSeeWatchlist
    ? mediaStatuses
        .filter((s) => s.status === "WATCHLIST")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    : [];
  const rated = canSeeHistory
    ? mediaStatuses.filter((s) => s.rating !== null)
    : [];
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
      : null;

  const watchedStatDisplay =
    isOwnProfile || canSeeHistory
      ? String(watched.length)
      : hiddenWatched > 0
        ? "—"
        : "0";
  const watchingStatDisplay =
    isOwnProfile || canSeeHistory
      ? String(watching.length)
      : hiddenWatching > 0
        ? "—"
        : "0";
  const listStatDisplay =
    isOwnProfile || canSeeWatchlist
      ? String(watchlist.length)
      : hiddenList > 0
        ? "—"
        : "0";
  const avgDisplay =
    isOwnProfile || canSeeHistory
      ? avgRating
        ? `${avgRating.toFixed(1)}★`
        : "—"
      : hasAnyHiddenRating
        ? "—"
        : "—";

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const hasAnyActivityTab = canSeeHistory || canSeeWatchlist;
  const defaultTab = canSeeHistory
    ? "watched"
    : canSeeWatchlist
      ? "watchlist"
      : "watched";
  const friendStateJson = toFriendJson(friendState);
  const friendKey =
    friendStateJson.kind === "outgoing" || friendStateJson.kind === "incoming"
      ? `${friendStateJson.kind}-${friendStateJson.requestId}`
      : friendStateJson.kind;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="flex items-start gap-5 min-w-0">
          <Avatar className="h-20 w-20 text-lg shrink-0">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{user.name}</h1>
            {user.bio && (
              <p className="text-muted-foreground mt-1">{user.bio}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Member since{" "}
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
            {!isOwnProfile && mutualCount > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {mutualCount} mutual {mutualCount === 1 ? "friend" : "friends"}
              </p>
            )}
          </div>
        </div>
        {!isOwnProfile && (
          <ProfileFriendActions
            key={friendKey}
            profileUserId={userId}
            initial={friendStateJson}
            className="shrink-0"
          />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {(
          [
            {
              label: "Watched",
              value: watchedStatDisplay,
              icon: Eye,
              color: "text-status-watched",
            },
            {
              label: "Watching",
              value: watchingStatDisplay,
              icon: Clock,
              color: "text-status-watching",
            },
            {
              label: "Watchlist",
              value: listStatDisplay,
              icon: Bookmark,
              color: "text-status-watchlist",
            },
            {
              label: "Avg rating",
              value: avgDisplay,
              icon: Star,
              color: "text-yellow-400",
            },
          ] as const
        ).map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {recentEntries.length > 0 && (
        <section className="mb-8">
          <h3 className="text-base font-semibold mb-3">
            Recent activity{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({recentEntries.length})
            </span>
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentEntries.map((entry) => {
              const href =
                entry.mediaItem.type === "MOVIE"
                  ? `/movies/${entry.mediaItem.tmdbId}`
                  : `/tv/${entry.mediaItem.tmdbId}`;
              const poster = posterUrl(entry.mediaItem.poster);
              return (
                <Link key={entry.id} href={href} className="shrink-0 group">
                  <div className="w-16 space-y-1">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={entry.mediaItem.title}
                        width={64}
                        height={96}
                        className="rounded object-cover w-16 h-24 group-hover:opacity-80 transition-opacity"
                        unoptimized
                      />
                    ) : (
                      <div className="w-16 h-24 rounded bg-muted flex items-center justify-center">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground truncate leading-tight">
                      {entry.watchedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {hasAnyActivityTab ? (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {canSeeHistory && (
              <>
                <TabsTrigger value="watched">
                  Watched ({watched.length})
                </TabsTrigger>
                <TabsTrigger value="watching">
                  Watching ({watching.length})
                </TabsTrigger>
              </>
            )}
            {canSeeWatchlist && (
              <TabsTrigger value="watchlist">
                Watchlist ({watchlist.length})
              </TabsTrigger>
            )}
          </TabsList>

          {canSeeHistory && (
            <TabsContent value="watched" className="mt-4">
              {watched.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">
                  Nothing here yet
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {watched.map((s) => (
                    <MediaCard
                      key={s.id}
                      tmdbId={s.mediaItem.tmdbId}
                      type={
                        s.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"
                      }
                      title={s.mediaItem.title}
                      poster={s.mediaItem.poster}
                      year={s.mediaItem.year}
                      rating={s.rating}
                      status={s.status}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
          {canSeeHistory && (
            <TabsContent value="watching" className="mt-4">
              {watching.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">
                  Nothing here yet
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {watching.map((s) => (
                    <MediaCard
                      key={s.id}
                      tmdbId={s.mediaItem.tmdbId}
                      type={
                        s.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"
                      }
                      title={s.mediaItem.title}
                      poster={s.mediaItem.poster}
                      year={s.mediaItem.year}
                      rating={s.rating}
                      status={s.status}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
          {canSeeWatchlist && (
            <TabsContent value="watchlist" className="mt-4">
              {watchlist.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">
                  Nothing here yet
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {watchlist.map((s) => (
                    <MediaCard
                      key={s.id}
                      tmdbId={s.mediaItem.tmdbId}
                      type={
                        s.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"
                      }
                      title={s.mediaItem.title}
                      poster={s.mediaItem.poster}
                      year={s.mediaItem.year}
                      rating={s.rating}
                      status={s.status}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-10 text-center">
          <Lock className="h-9 w-9 text-muted-foreground" />
          <div className="space-y-1 max-w-sm">
            <p className="font-medium">
              This member’s list is not visible to you
            </p>
            <p className="text-sm text-muted-foreground">
              This member can limit their watchlist and watch activity to
              friends only. You can send a friend request, or they can open
              Settings → Privacy to change who can see each section.
            </p>
          </div>
          {!isOwnProfile &&
            (friendState.kind === "none" ||
              friendState.kind === "outgoing") && (
              <Button asChild>
                <Link href="/settings/friends">Friends settings</Link>
              </Button>
            )}
        </div>
      )}
    </div>
  );
}
