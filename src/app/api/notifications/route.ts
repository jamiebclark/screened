import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const take = 30;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        listAccessRequest: {
          include: {
            list: { select: { id: true, name: true, slug: true } },
            requester: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        friendRequest: {
          include: {
            fromUser: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      readAt: n.readAt,
      createdAt: n.createdAt,
      listAccessRequest: n.listAccessRequest
        ? {
            id: n.listAccessRequest.id,
            status: n.listAccessRequest.status,
            list: n.listAccessRequest.list,
            requester: n.listAccessRequest.requester,
          }
        : null,
      friendRequest: n.friendRequest
        ? {
            id: n.friendRequest.id,
            fromUser: n.friendRequest.fromUser,
          }
        : null,
    })),
  });
}
