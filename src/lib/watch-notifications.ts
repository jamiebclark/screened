import { prisma } from "@/lib/prisma";
import { listFriendUserIds } from "@/lib/friendship";
import { NotificationType } from "@/generated/prisma";
import { sendDM, discordFeatures } from "@/lib/discord";

/**
 * Creates FRIEND_WATCHED_YOUR_WATCHLIST notifications for friends who have
 * mediaItemId on their WATCHLIST. Call this after a WatchEntry is created
 * for a manual watch action or status transition — NOT from bulk syncs
 * (Plex/Letterboxd) to avoid notification spam.
 *
 * Also sends Discord DMs to friends with a linked Discord account and dmEnabled=true,
 * when the bot is configured.
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

  // Send DMs if bot is configured
  if (!discordFeatures().bot) return;

  const watcher = await prisma.user.findUnique({
    where: { id: watcherId },
    select: { name: true },
  });
  const mediaItem = await prisma.mediaItem.findUnique({
    where: { id: mediaItemId },
    select: { title: true, year: true, type: true, tmdbId: true, poster: true },
  });
  if (!watcher || !mediaItem) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const path = mediaItem.type === "MOVIE" ? "movies" : "tv";
  const titleLine = mediaItem.year ? `${mediaItem.title} (${mediaItem.year})` : mediaItem.title;

  const friendUserIds = friendsWithTitle.map((f) => f.userId);
  const discordConnections = await prisma.discordConnection.findMany({
    where: { userId: { in: friendUserIds }, dmEnabled: true },
    select: { discordUserId: true },
  });

  for (const { discordUserId } of discordConnections) {
    await sendDM(discordUserId, {
      description: `**${watcher.name}** watched **${titleLine}** — a title on your watchlist`,
      color: 0x5865f2,
      url: `${appUrl}/${path}/${mediaItem.tmdbId}`,
      ...(mediaItem.poster && {
        thumbnail: { url: `https://image.tmdb.org/t/p/w185${mediaItem.poster}` },
      }),
    });
  }
}
