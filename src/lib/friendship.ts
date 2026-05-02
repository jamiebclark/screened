import { prisma } from "@/lib/prisma";
import { sortedFriendshipUserIds } from "@/lib/profile-visibility";
import { NotificationType } from "@/generated/prisma";

export type ProfileFriendState =
  | { kind: "self" }
  | { kind: "friends" }
  | { kind: "outgoing"; requestId: string }
  | { kind: "incoming"; requestId: string }
  | { kind: "none" };

/** All accepted friend user ids (both directions). */
export async function listFriendUserIds(viewerId: string): Promise<string[]> {
  const [asLow, asHigh] = await Promise.all([
    prisma.friendship.findMany({
      where: { userLowId: viewerId },
      select: { userHighId: true },
    }),
    prisma.friendship.findMany({
      where: { userHighId: viewerId },
      select: { userLowId: true },
    }),
  ]);
  return [...asLow.map((r) => r.userHighId), ...asHigh.map((r) => r.userLowId)];
}

export async function areFriends(
  userId: string,
  otherUserId: string,
): Promise<boolean> {
  if (userId === otherUserId) return true;
  const { userLowId, userHighId } = sortedFriendshipUserIds(
    userId,
    otherUserId,
  );
  const row = await prisma.friendship.findUnique({
    where: { userLowId_userHighId: { userLowId, userHighId } },
    select: { id: true },
  });
  return row != null;
}

export async function getProfileFriendState(
  viewerId: string | undefined,
  profileUserId: string,
): Promise<ProfileFriendState> {
  if (!viewerId) return { kind: "none" };
  if (viewerId === profileUserId) return { kind: "self" };

  const { userLowId, userHighId } = sortedFriendshipUserIds(
    viewerId,
    profileUserId,
  );
  const existing = await prisma.friendship.findUnique({
    where: { userLowId_userHighId: { userLowId, userHighId } },
    select: { id: true },
  });
  if (existing) return { kind: "friends" };

  const outgoing = await prisma.friendRequest.findUnique({
    where: {
      fromUserId_toUserId: { fromUserId: viewerId, toUserId: profileUserId },
    },
    select: { id: true },
  });
  if (outgoing) return { kind: "outgoing", requestId: outgoing.id };

  const incoming = await prisma.friendRequest.findUnique({
    where: {
      fromUserId_toUserId: { fromUserId: profileUserId, toUserId: viewerId },
    },
    select: { id: true },
  });
  if (incoming) return { kind: "incoming", requestId: incoming.id };

  return { kind: "none" };
}

/** Creates friendship (idempotent) and removes pending requests in either direction. */
export async function createFriendshipAndClearPending(
  userA: string,
  userB: string,
) {
  const { userLowId, userHighId } = sortedFriendshipUserIds(userA, userB);
  return prisma.$transaction(async (tx) => {
    await tx.friendship.upsert({
      where: { userLowId_userHighId: { userLowId, userHighId } },
      create: { userLowId, userHighId },
      update: {},
    });
    await tx.friendRequest.deleteMany({
      where: {
        OR: [
          { fromUserId: userA, toUserId: userB },
          { fromUserId: userB, toUserId: userA },
        ],
      },
    });
  });
}

export async function countMutualFriends(
  userA: string,
  userB: string,
): Promise<number> {
  const [friendsA, friendsB] = await Promise.all([
    listFriendUserIds(userA),
    listFriendUserIds(userB),
  ]);
  const setB = new Set(friendsB);
  return friendsA.filter((id) => setB.has(id)).length;
}

export async function notifyFriendRequest(requestId: string, toUserId: string) {
  await prisma.notification.create({
    data: {
      userId: toUserId,
      type: NotificationType.FRIEND_REQUEST,
      friendRequestId: requestId,
    },
  });
}
