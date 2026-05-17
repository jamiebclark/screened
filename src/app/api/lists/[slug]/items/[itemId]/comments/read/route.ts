import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string; itemId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId } = await params;
  const userId = session.user.id;

  const list = await prisma.list.findUnique({
    where: { slug },
    select: { id: true, members: { select: { userId: true } }, ownerId: true },
  });
  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isMember =
    list.members.some((m) => m.userId === userId) || list.ownerId === userId;
  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await prisma.listItem.findUnique({
    where: { id: itemId },
    select: { listId: true },
  });
  if (!item || item.listId !== list.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.listItemCommentRead.upsert({
    where: { userId_listItemId: { userId, listItemId: itemId } },
    create: { userId, listItemId: itemId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}
