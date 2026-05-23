import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  const { slug } = await params;

  const list = await prisma.list.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      items: {
        include: {
          mediaItem: true,
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = session?.user?.id;
  const isMember = userId && list.members.some((m) => m.userId === userId);

  if (!list.isPublic && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Never expose the Discord webhook URL in API responses (it's a server secret)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { discordWebhookUrl: _webhook, ...safeList } = list;
  return NextResponse.json(safeList);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    isPublic?: boolean;
    rankingEnabled?: boolean;
    votingEnabled?: boolean;
    commentsEnabled?: boolean;
    displayMode?: "GRID" | "LIST";
    itemCap?: number | null;
  };

  const list = await prisma.list.findUnique({
    where: { slug },
    include: { items: { select: { id: true }, orderBy: { addedAt: "asc" } } },
  });
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Resolve ranking/voting mutex
  let rankingEnabled = body.rankingEnabled ?? list.rankingEnabled;
  let votingEnabled = body.votingEnabled ?? list.votingEnabled;
  if (body.rankingEnabled === true) votingEnabled = false;
  if (body.votingEnabled === true) rankingEnabled = false;

  const rankingTurnedOn = rankingEnabled && !list.rankingEnabled;
  const rankingTurnedOff = !rankingEnabled && list.rankingEnabled;

  let updated;
  if (rankingTurnedOn) {
    // Assign sequential positions based on current addedAt ASC order
    updated = await prisma.$transaction(async (tx) => {
      await Promise.all(
        list.items.map((item, idx) =>
          tx.listItem.update({
            where: { id: item.id },
            data: { position: idx + 1 },
          }),
        ),
      );
      return tx.list.update({
        where: { slug },
        data: {
          name: body.name ?? list.name,
          description:
            body.description !== undefined
              ? body.description
              : list.description,
          isPublic: body.isPublic ?? list.isPublic,
          rankingEnabled,
          votingEnabled,
          commentsEnabled: body.commentsEnabled ?? list.commentsEnabled,
          displayMode: body.displayMode ?? list.displayMode,
          itemCap: body.itemCap !== undefined ? body.itemCap : list.itemCap,
        },
      });
    });
  } else if (rankingTurnedOff) {
    // Clear all positions
    updated = await prisma.$transaction(async (tx) => {
      await tx.listItem.updateMany({
        where: { listId: list.id },
        data: { position: null },
      });
      return tx.list.update({
        where: { slug },
        data: {
          name: body.name ?? list.name,
          description:
            body.description !== undefined
              ? body.description
              : list.description,
          isPublic: body.isPublic ?? list.isPublic,
          rankingEnabled,
          votingEnabled,
          commentsEnabled: body.commentsEnabled ?? list.commentsEnabled,
          displayMode: body.displayMode ?? list.displayMode,
          itemCap: body.itemCap !== undefined ? body.itemCap : list.itemCap,
        },
      });
    });
  } else {
    updated = await prisma.list.update({
      where: { slug },
      data: {
        name: body.name ?? list.name,
        description:
          body.description !== undefined ? body.description : list.description,
        isPublic: body.isPublic ?? list.isPublic,
        rankingEnabled,
        votingEnabled,
        commentsEnabled: body.commentsEnabled ?? list.commentsEnabled,
        displayMode: body.displayMode ?? list.displayMode,
        itemCap: body.itemCap !== undefined ? body.itemCap : list.itemCap,
      },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (list.discordWebhookId && process.env.DISCORD_BOT_TOKEN) {
    await fetch(
      `https://discord.com/api/v10/webhooks/${list.discordWebhookId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      },
    ).catch(() => null);
  }

  await prisma.list.delete({ where: { slug } });
  return NextResponse.json({ success: true });
}
