import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCurateListItems } from "@/lib/list-item-permissions";

type Params = { params: Promise<{ slug: string; itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId } = await params;

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

  let body: { isHidden?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "isHidden must be true or false" },
      { status: 400 },
    );
  }

  if (typeof body.isHidden !== "boolean") {
    return NextResponse.json(
      { error: "isHidden must be true or false" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.listItem.update({
      where: { id: itemId },
      data: { isHidden: body.isHidden },
      select: { id: true, isHidden: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update list item hidden state", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
