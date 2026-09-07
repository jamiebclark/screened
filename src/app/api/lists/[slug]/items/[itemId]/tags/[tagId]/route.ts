import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCurateListItems } from "@/lib/list-item-permissions";

type Params = {
  params: Promise<{ slug: string; itemId: string; tagId: string }>;
};

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId, tagId } = await params;

  const list = await prisma.list.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.listItem.findUnique({
    where: { id: itemId },
    select: { id: true, listId: true },
  });
  if (!item || item.listId !== list.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memberRole =
    list.members.find((m) => m.userId === session.user.id)?.role ?? null;
  const canCurate = canCurateListItems({
    isOwner: list.ownerId === session.user.id,
    memberRole,
  });
  if (!canCurate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tag = await prisma.listItemTag.findUnique({
    where: { id: tagId },
    select: { id: true, listItemId: true },
  });
  if (!tag || tag.listItemId !== itemId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.listItemTag.delete({ where: { id: tagId } });

    const tags = await prisma.listItemTag.findMany({
      where: { listItemId: itemId },
      select: { id: true, label: true, normalized: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Failed to delete list item tag", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
