import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma";
import { sendDM, discordFeatures } from "@/lib/discord";

export async function listAdminUserIdsForList(
  listId: string,
): Promise<string[]> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });
  return list ? [list.ownerId] : [];
}

export async function notifyAdminsOfPendingAccessRequest(
  listId: string,
  requestId: string,
) {
  const adminIds = await listAdminUserIdsForList(listId);
  if (adminIds.length === 0) return;

  await prisma.notification.createMany({
    data: adminIds.map((userId) => ({
      userId,
      type: NotificationType.LIST_ACCESS_REQUEST,
      listAccessRequestId: requestId,
    })),
  });

  if (!discordFeatures().bot) return;

  const [accessRequest, discordConnections] = await Promise.all([
    prisma.listAccessRequest.findUnique({
      where: { id: requestId },
      select: {
        requester: { select: { name: true } },
        list: { select: { name: true, slug: true } },
      },
    }),
    prisma.discordConnection.findMany({
      where: { userId: { in: adminIds }, dmEnabled: true },
      select: { discordUserId: true },
    }),
  ]);

  if (!accessRequest || discordConnections.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  for (const { discordUserId } of discordConnections) {
    await sendDM(discordUserId, {
      description: `**${accessRequest.requester.name}** requested access to **${accessRequest.list.name}**`,
      color: 0x5865f2,
      url: `${appUrl}/lists/${accessRequest.list.slug}`,
    });
  }
}

export async function markAccessRequestNotificationsRead(requestId: string) {
  await prisma.notification.updateMany({
    where: { listAccessRequestId: requestId },
    data: { readAt: new Date() },
  });
}
