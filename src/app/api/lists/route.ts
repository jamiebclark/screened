import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, generateToken } from "@/lib/utils";
import { applyPreset, type ListPreset } from "@/lib/list-presets";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  if (mine) {
    const lists = await prisma.list.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: { _count: { select: { items: true, members: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(lists);
  }

  const lists = await prisma.list.findMany({
    where: {
      OR: [
        { isPublic: true },
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { items: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    description?: string;
    isPublic?: boolean;
    preset?: ListPreset;
    rankingEnabled?: boolean;
    votingEnabled?: boolean;
    commentsEnabled?: boolean;
    displayMode?: "GRID" | "LIST";
    itemCap?: number | null;
  };
  const { name, description, isPublic = true, preset } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const flags = applyPreset(preset ?? "custom", {
    rankingEnabled: body.rankingEnabled,
    votingEnabled: body.votingEnabled,
    commentsEnabled: body.commentsEnabled,
    displayMode: body.displayMode,
  });

  if (flags.rankingEnabled && flags.votingEnabled) {
    return NextResponse.json(
      { error: "rankingEnabled and votingEnabled cannot both be true" },
      { status: 400 },
    );
  }

  let slug = slugify(name);
  const existing = await prisma.list.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const list = await prisma.list.create({
    data: {
      name: name.trim(),
      description: description?.trim(),
      slug,
      isPublic,
      ownerId: session.user.id,
      radarrToken: generateToken(24),
      rankingEnabled: flags.rankingEnabled,
      votingEnabled: flags.votingEnabled,
      commentsEnabled: flags.commentsEnabled,
      displayMode: flags.displayMode,
      itemCap: body.itemCap ?? null,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
    include: { _count: { select: { items: true, members: true } } },
  });

  return NextResponse.json(list, { status: 201 });
}
