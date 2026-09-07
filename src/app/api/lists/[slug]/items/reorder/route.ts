import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePositions } from "@/lib/list-item-ordering";

type Params = { params: Promise<{ slug: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const list = await prisma.list.findUnique({
    where: { slug },
    include: {
      members: { select: { userId: true, role: true } },
      items: { select: { id: true } },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = list.members.find((m) => m.userId === session.user.id);
  const isOwner = list.ownerId === session.user.id;
  const isContributor =
    isOwner || member?.role === "CONTRIBUTOR" || member?.role === "OWNER";

  if (!isContributor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!list.rankingEnabled) {
    return NextResponse.json(
      { error: "This list is not ranked, so items cannot be reordered" },
      { status: 400 },
    );
  }

  const body = (await req.json()) as {
    positions?: { id: string; position: number }[];
  };

  if (!Array.isArray(body.positions) || body.positions.length === 0) {
    return NextResponse.json({ error: "Invalid positions" }, { status: 400 });
  }

  const listItemIds = new Set(list.items.map((i) => i.id));
  for (const entry of body.positions) {
    if (!listItemIds.has(entry.id)) {
      return NextResponse.json(
        { error: "One or more items do not belong to this list" },
        { status: 400 },
      );
    }
  }

  const uniqueIds = new Set(body.positions.map((entry) => entry.id));
  if (uniqueIds.size !== body.positions.length) {
    return NextResponse.json(
      { error: "Each item may appear only once" },
      { status: 400 },
    );
  }

  if (body.positions.length !== list.items.length) {
    return NextResponse.json(
      { error: "Reorder must include every item on the list" },
      { status: 400 },
    );
  }

  const normalized = normalizePositions(body.positions);

  try {
    await prisma.$transaction(
      normalized.map(({ id, position }) =>
        prisma.listItem.update({ where: { id }, data: { position } }),
      ),
    );
  } catch (error) {
    console.error("Failed to save list item order", error);
    return NextResponse.json(
      { error: "Could not save the new order" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
