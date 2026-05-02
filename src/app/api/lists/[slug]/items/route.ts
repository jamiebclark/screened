import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyListItemAdded } from "@/lib/discord";
import { getMovie, getTvShow } from "@/lib/tmdb";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ slug: string }> };

async function getOrCreateMediaItem(tmdbId: number, type: "movie" | "tv") {
  const mediaType = type === "movie" ? MediaType.MOVIE : MediaType.TV;
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: mediaType } },
  });
  if (existing) return existing;

  if (type === "movie") {
    const movie = await getMovie(tmdbId);
    return prisma.mediaItem.create({
      data: {
        tmdbId,
        type: MediaType.MOVIE,
        title: movie.title,
        poster: movie.poster_path,
        backdrop: movie.backdrop_path,
        year: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
        overview: movie.overview,
        genres: movie.genres.map((g) => g.name),
        runtime: movie.runtime,
      },
    });
  } else {
    const show = await getTvShow(tmdbId);
    return prisma.mediaItem.create({
      data: {
        tmdbId,
        type: MediaType.TV,
        title: show.name,
        poster: show.poster_path,
        backdrop: show.backdrop_path,
        year: show.first_air_date
          ? new Date(show.first_air_date).getFullYear()
          : null,
        overview: show.overview,
        genres: show.genres.map((g) => g.name),
        runtime: show.episode_run_time[0] ?? null,
      },
    });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = (await req.json()) as {
    tmdbId?: number;
    type?: string;
    notes?: string;
  };
  const { tmdbId, type, notes } = body;

  if (!tmdbId || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const list = await prisma.list.findUnique({
    where: { slug },
    include: { members: true },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = list.members.some((m) => m.userId === session.user.id);
  if (!isMember)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mediaItem = await getOrCreateMediaItem(tmdbId, type as "movie" | "tv");

  const item = await prisma.listItem.upsert({
    where: {
      listId_mediaItemId: { listId: list.id, mediaItemId: mediaItem.id },
    },
    update: { notes: notes ?? null, addedById: session.user.id },
    create: {
      listId: list.id,
      mediaItemId: mediaItem.id,
      addedById: session.user.id,
      notes: notes ?? null,
    },
    include: { mediaItem: true, addedBy: { select: { id: true, name: true } } },
  });

  await prisma.list.update({
    where: { id: list.id },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/lists/${slug}`);

  after(async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const listWithWebhook = await prisma.list.findUnique({
      where: { id: list.id },
      select: { discordWebhookUrl: true, name: true, slug: true },
    });
    if (!listWithWebhook?.discordWebhookUrl) return;
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    await notifyListItemAdded(listWithWebhook.discordWebhookUrl, {
      userName: user?.name ?? "Someone",
      title: mediaItem.title,
      year: mediaItem.year,
      type: type as "movie" | "tv",
      poster: mediaItem.poster,
      listName: listWithWebhook.name,
      appUrl,
      tmdbId: mediaItem.tmdbId,
      listSlug: listWithWebhook.slug,
    });
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId)
    return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.listItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete =
    item.addedById === session.user.id || list.ownerId === session.user.id;
  if (!canDelete)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.listItem.delete({ where: { id: itemId } });
  revalidatePath(`/lists/${slug}`);
  return NextResponse.json({ success: true });
}
