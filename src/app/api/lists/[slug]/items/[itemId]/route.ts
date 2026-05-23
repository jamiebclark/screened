import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string; itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId } = await params;

  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = await prisma.listItem.findUnique({ where: { id: itemId } });
  if (!item || item.listId !== list.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = list.ownerId === session.user.id;
  const isAdder = item.addedById === session.user.id;
  if (!isOwner && !isAdder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    notes?: string;
    noteIsSpoiler?: boolean;
  };

  const updated = await prisma.listItem.update({
    where: { id: itemId },
    data: {
      notes: body.notes !== undefined ? body.notes : item.notes,
      noteIsSpoiler:
        body.noteIsSpoiler !== undefined
          ? body.noteIsSpoiler
          : item.noteIsSpoiler,
    },
  });

  return NextResponse.json(updated);
}
