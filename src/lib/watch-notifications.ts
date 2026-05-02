import { prisma } from "@/lib/prisma";
import { listFriendUserIds } from "@/lib/friendship";
import { NotificationType } from "@/generated/prisma";

/**
 * Creates FRIEND_WATCHED_YOUR_WATCHLIST notifications for friends who have
 * mediaItemId on their WATCHLIST. Call this after a WatchEntry is created
 * for a manual watch action or status transition — NOT from bulk syncs
 * (Plex/Letterboxd) to avoid notification spam.
 */
export async function notifyFriendsOfWatch(
  watcherId: string,
  mediaItemId: string,
  watchEntryId: string,
): Promise<void> {
  const friendIds = await listFriendUserIds(watcherId);
  if (friendIds.length === 0) return;

  const friendsWithTitle = await prisma.userMediaStatus.findMany({
    where: { userId: { in: friendIds }, mediaItemId, status: "WATCHLIST" },
    select: { userId: true },
  });
  if (friendsWithTitle.length === 0) return;

  await prisma.notification.createMany({
    data: friendsWithTitle.map(({ userId }) => ({
      userId,
      type: NotificationType.FRIEND_WATCHED_YOUR_WATCHLIST,
      watchEntryId,
    })),
    skipDuplicates: true,
  });
}
