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
    discordWebhookUrl?: string | null;
  };

  // Validate webhook URL format if provided
  if (
    body.discordWebhookUrl &&
    !body.discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")
  ) {
    return NextResponse.json(
      { error: "Invalid Discord webhook URL" },
      { status: 400 },
    );
  }

  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.list.update({
    where: { slug },
    data: {
      name: body.name ?? list.name,
      description: body.description !== undefined ? body.description : list.description,
      isPublic: body.isPublic ?? list.isPublic,
      ...(body.discordWebhookUrl !== undefined && {
        discordWebhookUrl: body.discordWebhookUrl || null,
      }),
    },
  });

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

  await prisma.list.delete({ where: { slug } });
  return NextResponse.json({ success: true });
}
