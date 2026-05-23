import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string; itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId } = await params;
  const body = (await req.json()) as { value?: number };

  if (body.value !== 1 && body.value !== -1) {
    return NextResponse.json(
      { error: "value must be 1 or -1" },
      { status: 400 },
    );
  }

  const list = await prisma.list.findUnique({
    where: { slug },
    select: {
      id: true,
      votingEnabled: true,
      members: { select: { userId: true } },
    },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!list.votingEnabled) {
    return NextResponse.json(
      { error: "Voting is disabled for this list" },
      { status: 403 },
    );
  }

  const isMember = list.members.some((m) => m.userId === session.user.id);
  if (!isMember)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const item = await prisma.listItem.findUnique({
    where: { id: itemId },
    select: { id: true, listId: true },
  });
  if (!item || item.listId !== list.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.listItemVote.findUnique({
    where: {
      listItemId_userId: { listItemId: itemId, userId: session.user.id },
    },
  });

  if (existing?.value === body.value) {
    await prisma.listItemVote.delete({
      where: {
        listItemId_userId: { listItemId: itemId, userId: session.user.id },
      },
    });
  } else {
    await prisma.listItemVote.upsert({
      where: {
        listItemId_userId: { listItemId: itemId, userId: session.user.id },
      },
      create: {
        listItemId: itemId,
        userId: session.user.id,
        value: body.value,
      },
      update: { value: body.value },
    });
  }

  const votes = await prisma.listItemVote.findMany({
    where: { listItemId: itemId },
    select: { value: true, userId: true },
  });

  revalidatePath(`/lists/${slug}`);

  return NextResponse.json({
    upvotes: votes.filter((v) => v.value === 1).length,
    downvotes: votes.filter((v) => v.value === -1).length,
    userVote: votes.find((v) => v.userId === session.user.id)?.value ?? null,
  });
}
