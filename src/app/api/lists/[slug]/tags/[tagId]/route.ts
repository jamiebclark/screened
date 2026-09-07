import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCurateListItems } from "@/lib/list-item-permissions";
import { validateTagName } from "@/lib/list-item-tags";

type Params = { params: Promise<{ slug: string; tagId: string }> };

async function loadListAndTag(slug: string, tagId: string) {
  const list = await prisma.list.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!list) return { list: null, tag: null };

  const tag = await prisma.listTag.findUnique({
    where: { id: tagId },
    select: { id: true, listId: true, label: true, normalized: true },
  });
  if (!tag || tag.listId !== list.id) return { list, tag: null };

  return { list, tag };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, tagId } = await params;
  const { list, tag } = await loadListAndTag(slug, tagId);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberRole =
    list.members.find((m) => m.userId === session.user.id)?.role ?? null;
  const canCurate = canCurateListItems({
    isOwner: list.ownerId === session.user.id,
    memberRole,
  });
  if (!canCurate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { label?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Tag must be text" }, { status: 400 });
  }

  const nameResult = validateTagName(body.label);
  if (!nameResult.ok) {
    return NextResponse.json({ error: nameResult.error }, { status: 400 });
  }
  const { label, normalized } = nameResult.value;

  if (normalized !== tag.normalized) {
    const collision = await prisma.listTag.findUnique({
      where: { listId_normalized: { listId: list.id, normalized } },
      select: { id: true },
    });
    if (collision && collision.id !== tag.id) {
      return NextResponse.json(
        { error: "Another tag on this list already uses that name" },
        { status: 409 },
      );
    }
  }

  try {
    const updated = await prisma.listTag.update({
      where: { id: tag.id },
      data: { label, normalized },
      select: { id: true, label: true, normalized: true },
    });
    return NextResponse.json({ tag: updated });
  } catch (error) {
    console.error("Failed to rename list tag", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, tagId } = await params;
  const { list, tag } = await loadListAndTag(slug, tagId);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberRole =
    list.members.find((m) => m.userId === session.user.id)?.role ?? null;
  const canCurate = canCurateListItems({
    isOwner: list.ownerId === session.user.id,
    memberRole,
  });
  if (!canCurate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const removedFromItems = await prisma.listItemTag.count({
      where: { listTagId: tag.id },
    });
    await prisma.listTag.delete({ where: { id: tag.id } });
    return NextResponse.json({ success: true, removedFromItems });
  } catch (error) {
    console.error("Failed to delete list tag", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
