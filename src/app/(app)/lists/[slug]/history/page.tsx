import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, History as HistoryIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MediaType } from "@/generated/prisma";
import { tmdbImageUrl } from "@/lib/utils";
import {
  fetchListWatchHistory,
  type ListWatchHistoryRow,
} from "@/lib/list-watch-history";
import { describeChallengeWindow } from "@/lib/list-challenge-window";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const list = await prisma.list.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: list ? `${list.name} · Challenge history` : "Challenge history",
  };
}

function dayKey(date: Date): string {
  return date.toDateString();
}

function formatDayHeading(date: Date): string {
  const now = new Date();
  const includeYear = date.getFullYear() !== now.getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function groupByDay(
  rows: ListWatchHistoryRow[],
): { key: string; heading: string; rows: ListWatchHistoryRow[] }[] {
  const groups: {
    key: string;
    heading: string;
    rows: ListWatchHistoryRow[];
  }[] = [];
  for (const row of rows) {
    const key = dayKey(row.watchedAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(row);
    } else {
      groups.push({
        key,
        heading: formatDayHeading(row.watchedAt),
        rows: [row],
      });
    }
  }
  return groups;
}

function HistoryRow({ row }: { row: ListWatchHistoryRow }) {
  const isMovie = row.mediaItem.type === MediaType.MOVIE;
  const href = isMovie
    ? `/movies/${row.mediaItem.tmdbId}`
    : `/tv/${row.mediaItem.tmdbId}`;
  const poster = tmdbImageUrl(row.mediaItem.poster, "w92");
  const episodeLabel =
    row.seasonNumber != null && row.episodeNumber != null
      ? `S${row.seasonNumber}E${row.episodeNumber}`
      : null;

  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <Link href={href} className="shrink-0">
        {poster ? (
          <Image
            src={poster}
            alt={row.mediaItem.title}
            width={40}
            height={60}
            className="h-15 w-10 rounded object-cover"
          />
        ) : (
          <div className="h-15 w-10 rounded bg-zinc-800" />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="truncate text-sm font-medium hover:underline"
        >
          {row.mediaItem.title}
          {row.mediaItem.year != null && (
            <span className="text-muted-foreground">
              {" "}
              ({row.mediaItem.year})
            </span>
          )}
        </Link>
        {episodeLabel && (
          <p className="text-xs text-muted-foreground">{episodeLabel}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={row.user.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs">
            {row.user.name?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-right">
          <p className="text-sm">{row.user.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(row.watchedAt)}
          </p>
        </div>
      </div>
    </li>
  );
}

export default async function ListHistoryPage({ params }: Params) {
  const { slug } = await params;

  const list = await prisma.list.findUnique({
    where: { slug },
    include: {
      members: { select: { userId: true } },
      items: { select: { mediaItemId: true } },
    },
  });
  if (!list) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/lists/${slug}/history`)}`,
    );
  }

  const isOwner = userId === list.ownerId;
  const isMember = isOwner || list.members.some((m) => m.userId === userId);
  if (!isMember) {
    redirect(`/lists/${slug}`);
  }

  const challengeWindow = {
    startsAt: list.challengeStartsAt,
    endsAt: list.challengeEndsAt,
  };
  const hasWindow =
    challengeWindow.startsAt != null || challengeWindow.endsAt != null;
  const memberUserIds = [
    ...new Set([list.ownerId, ...list.members.map((m) => m.userId)]),
  ];
  const mediaItemIds = list.items.map((i) => i.mediaItemId);

  const rows = await fetchListWatchHistory({
    mediaItemIds,
    memberUserIds,
    window: challengeWindow,
    take: 200,
  });

  const groups = groupByDay(rows);
  const windowDescription = describeChallengeWindow(challengeWindow);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/lists/${slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {list.name}
      </Link>
      <h1 className="text-2xl font-bold">Challenge history</h1>
      {windowDescription && (
        <p className="mt-1 text-sm text-muted-foreground">
          {windowDescription}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          <HistoryIcon className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>
            {hasWindow
              ? "Nothing watched in this window yet."
              : "No member has logged a watch of anything on this list yet."}
          </p>
          {hasWindow && windowDescription && (
            <p className="mt-1 text-sm">{windowDescription}</p>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="sticky top-16 z-10 -mx-4 mb-3 bg-background/95 px-4 py-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                {group.heading}
              </h2>
              <ul className="space-y-2">
                {group.rows.map((row) => (
                  <HistoryRow key={row.id} row={row} />
                ))}
              </ul>
            </div>
          ))}
          {rows.length === 200 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Showing the 200 most recent watches.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
