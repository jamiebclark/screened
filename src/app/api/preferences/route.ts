import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PreferenceType } from "@/generated/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await prisma.userPreference.findMany({
    where: { userId: session.user.id },
    include: {
      mediaItem: {
        select: { id: true, tmdbId: true, title: true, poster: true, year: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(preferences);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    mediaItemId?: string;
    type?: string;
    weight?: number;
  };

  const { mediaItemId, type, weight } = body;

  if (!mediaItemId || !type || !["ATTRACTOR", "REPELLER"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const preference = await prisma.userPreference.upsert({
    where: {
      userId_mediaItemId_type: {
        userId: session.user.id,
        mediaItemId,
        type: type as PreferenceType,
      },
    },
    create: {
      userId: session.user.id,
      mediaItemId,
      type: type as PreferenceType,
      weight: weight ?? 1.0,
    },
    update: { weight: weight ?? 1.0 },
    include: {
      mediaItem: {
        select: { id: true, tmdbId: true, title: true, poster: true, year: true },
      },
    },
  });

  return NextResponse.json(preference, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const pref = await prisma.userPreference.findUnique({ where: { id } });
  if (!pref || pref.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userPreference.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
