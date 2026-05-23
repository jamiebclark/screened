import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    return NextResponse.json({ error: "List is not ranked" }, { status: 400 });
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
        { error: `Item ${entry.id} does not belong to this list` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(
    body.positions.map(({ id, position }) =>
      prisma.listItem.update({ where: { id }, data: { position } }),
    ),
  );

  return NextResponse.json({ success: true });
}
