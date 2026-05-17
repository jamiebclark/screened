import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string; itemId: string }> };

async function getMemberItem(slug: string, itemId: string, userId: string) {
  const list = await prisma.list.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, members: { select: { userId: true } } },
  });
  if (!list) return null;

  const isMember = list.members.some((m) => m.userId === userId);
  const isOwner = list.ownerId === userId;
  if (!isMember && !isOwner) return null;

  const item = await prisma.listItem.findUnique({
    where: { id: itemId },
    select: { id: true, listId: true },
  });
  if (!item || item.listId !== list.id) return null;

  return { list, item };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId } = await params;
  const result = await getMemberItem(slug, itemId, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const comments = await prisma.listItemComment.findMany({
    where: { listItemId: itemId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      userId: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId } = await params;
  const result = await getMemberItem(slug, itemId, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as { content?: string };
  const content = body.content?.trim();
  if (!content || content.length === 0) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (content.length > 1000) {
    return NextResponse.json(
      { error: "content must be 1000 characters or fewer" },
      { status: 400 },
    );
  }

  const comment = await prisma.listItemComment.create({
    data: { listItemId: itemId, userId: session.user.id, content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      userId: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
