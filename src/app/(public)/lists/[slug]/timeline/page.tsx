import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveListAccess } from "@/lib/list-visibility";
import { describeChallengeWindow } from "@/lib/list-challenge-window";
import { fetchListWatchHistory } from "@/lib/list-watch-history";
import { buildListTimeline, stripWatchers } from "@/lib/list-watch-timeline";
import { ListTimeline } from "./list-timeline";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [session, list] = await Promise.all([
    auth(),
    prisma.list.findUnique({
      where: { slug },
      select: {
        name: true,
        visibility: true,
        ownerId: true,
        members: { select: { userId: true } },
      },
    }),
  ]);
  if (!list) return { title: "Timeline" };

  // Same leak guard as the list page: anonymous fetches of a members-only or
  // private list must not learn its name.
  const userId = session?.user?.id;
  const access = resolveListAccess({
    visibility: list.visibility,
    hasSession: !!userId,
    isMember:
      !!userId &&
      (list.ownerId === userId ||
        list.members.some((m) => m.userId === userId)),
  });
  return {
    title: access === "granted" ? `${list.name} · Timeline` : "Timeline",
  };
}

export default async function ListTimelinePage({ params }: Params) {
  const { slug } = await params;

  const list = await prisma.list.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      visibility: true,
      ownerId: true,
      challengeStartsAt: true,
      challengeEndsAt: true,
      members: { select: { userId: true } },
      items: {
        where: { isHidden: false },
        orderBy: [{ position: "asc" }, { addedAt: "desc" }],
        select: {
          id: true,
          mediaItemId: true,
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
      },
    },
  });
  if (!list) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  const isOwner = userId === list.ownerId;
  const isMember = !!userId && list.members.some((m) => m.userId === userId);

  const access = resolveListAccess({
    visibility: list.visibility,
    hasSession: !!userId,
    isMember: isMember || isOwner,
  });
  if (access === "login") {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/lists/${slug}/timeline`)}`,
    );
  }
  if (access === "forbidden") {
    // The list page owns the private-list gate and access-request flow.
    redirect(`/lists/${slug}`);
  }

  const window = {
    startsAt: list.challengeStartsAt,
    endsAt: list.challengeEndsAt,
  };
  const items = list.items.map((i) => ({
    listItemId: i.id,
    mediaItemId: i.mediaItemId,
    mediaItem: i.mediaItem,
  }));
  const memberUserIds = [
    ...new Set([list.ownerId, ...list.members.map((m) => m.userId)]),
  ];

  const watches = await fetchListWatchHistory({
    mediaItemIds: items.map((i) => i.mediaItemId),
    memberUserIds,
    window,
  });

  const full = buildListTimeline({ items, watches, window, now: new Date() });
  // Only the owner and members may learn who watched what; everyone else gets
  // a data shape with the identities already removed.
  const canSeeWatchers = isOwner || isMember;
  const timeline = canSeeWatchers ? full : stripWatchers(full);
  const windowDescription = describeChallengeWindow(window);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/lists/${slug}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {list.name}
      </Link>
      <h1 className="text-2xl font-bold">Timeline</h1>
      {windowDescription && (
        <p className="mt-1 text-sm text-muted-foreground">
          {windowDescription}
        </p>
      )}

      <div className="mt-8">
        <ListTimeline
          timeline={timeline}
          windowDescription={windowDescription}
        />
      </div>
    </div>
  );
}
