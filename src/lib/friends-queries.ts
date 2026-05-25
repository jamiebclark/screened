import { prisma } from "@/lib/prisma";

const friendSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

export type FriendBrief = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type FriendsData = {
  friends: FriendBrief[];
  outgoing: { id: string; toUser: FriendBrief; createdAt: Date }[];
  incoming: { id: string; fromUser: FriendBrief; createdAt: Date }[];
};

export async function getFriendsData(userId: string): Promise<FriendsData> {
  const [asLow, asHigh, outgoing, incoming] = await Promise.all([
    prisma.friendship.findMany({
      where: { userLowId: userId },
      include: { userHigh: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { userHighId: userId },
      include: { userLow: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { fromUserId: userId },
      include: { toUser: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { toUserId: userId },
      include: { fromUser: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    friends: [...asLow.map((f) => f.userHigh), ...asHigh.map((f) => f.userLow)],
    outgoing: outgoing.map((r) => ({
      id: r.id,
      toUser: r.toUser,
      createdAt: r.createdAt,
    })),
    incoming: incoming.map((r) => ({
      id: r.id,
      fromUser: r.fromUser,
      createdAt: r.createdAt,
    })),
  };
}

export type ActivitySnapshot = {
  title: string;
  mediaType: string;
  watchedAt: Date;
};

export async function getRecentActivityPerFriend(
  friendIds: string[],
): Promise<Map<string, ActivitySnapshot>> {
  if (friendIds.length === 0) return new Map();

  // Get the most recent watchedAt per friend
  const grouped = await prisma.watchEntry.groupBy({
    by: ["userId"],
    where: { userId: { in: friendIds } },
    _max: { watchedAt: true },
  });

  if (grouped.length === 0) return new Map();

  // Fetch the matching entry (with media title) for each friend's latest watch
  const entries = await Promise.all(
    grouped
      .filter((g) => g._max.watchedAt != null)
      .map((g) =>
        prisma.watchEntry.findFirst({
          where: { userId: g.userId, watchedAt: g._max.watchedAt! },
          select: {
            userId: true,
            watchedAt: true,
            mediaItem: { select: { title: true, type: true } },
          },
        }),
      ),
  );

  const result = new Map<string, ActivitySnapshot>();
  for (const entry of entries) {
    if (entry?.mediaItem) {
      result.set(entry.userId, {
        title: entry.mediaItem.title,
        mediaType: entry.mediaItem.type,
        watchedAt: entry.watchedAt,
      });
    }
  }
  return result;
}
