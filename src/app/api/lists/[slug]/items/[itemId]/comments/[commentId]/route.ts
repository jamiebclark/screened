import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ slug: string; itemId: string; commentId: string }>;
};

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, commentId } = await params;
  const userId = session.user.id;

  const list = await prisma.list.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comment = await prisma.listItemComment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      userId: true,
      listItem: { select: { listId: true } },
    },
  });

  if (!comment || comment.listItem.listId !== list.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAuthor = comment.userId === userId;
  const isListOwner = list.ownerId === userId;
  if (!isAuthor && !isListOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.listItemComment.delete({ where: { id: commentId } });

  return new NextResponse(null, { status: 204 });
}
