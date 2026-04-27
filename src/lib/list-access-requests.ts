import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma";

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
}

export async function markAccessRequestNotificationsRead(requestId: string) {
  await prisma.notification.updateMany({
    where: { listAccessRequestId: requestId },
    data: { readAt: new Date() },
  });
}
