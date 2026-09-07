import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyListItemAdded } from "@/lib/discord";
import { getMovie, getTvShow } from "@/lib/tmdb";
import { buildTagVocabulary, validateTagBatch } from "@/lib/list-item-tags";
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
        productionCountries: movie.production_country_codes,
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
        productionCountries: show.production_country_codes,
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
    noteIsSpoiler?: boolean;
    labels?: unknown;
  };
  const { tmdbId, type, notes, noteIsSpoiler, labels } = body;

  if (!tmdbId || !type || !["movie", "tv"].includes(type)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const list = await prisma.list.findUnique({
    where: { slug },
    include: {
      members: true,
      items: {
        select: { id: true, position: true },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = list.members.some((m) => m.userId === session.user.id);
  if (!isMember)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (list.itemCap !== null && list.items.length >= list.itemCap) {
    return NextResponse.json({ error: "List is at capacity" }, { status: 403 });
  }

  // Validate tags before creating anything, so a rejected batch cannot leave a
  // freshly added item behind. Vocabulary is this list's own tags, matching the
  // per-item editor's scoping.
  let tagsToCreate: { label: string; normalized: string }[] = [];
  if (labels !== undefined) {
    const vocabularySource = await prisma.listItemTag.findMany({
      where: { listItem: { listId: list.id } },
      select: { label: true, normalized: true, createdAt: true },
    });
    const result = validateTagBatch(
      labels,
      [],
      buildTagVocabulary([{ tags: vocabularySource }]),
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    tagsToCreate = result.value;
  }

  const mediaItem = await getOrCreateMediaItem(tmdbId, type as "movie" | "tv");

  const nextPosition = list.rankingEnabled
    ? Math.max(0, ...list.items.map((i) => i.position ?? 0)) + 1
    : null;

  const item = await prisma.listItem.upsert({
    where: {
      listId_mediaItemId: { listId: list.id, mediaItemId: mediaItem.id },
    },
    update: {
      notes: notes ?? null,
      noteIsSpoiler: noteIsSpoiler ?? false,
      addedById: session.user.id,
    },
    create: {
      listId: list.id,
      mediaItemId: mediaItem.id,
      addedById: session.user.id,
      notes: notes ?? null,
      noteIsSpoiler: noteIsSpoiler ?? false,
      position: nextPosition,
    },
    include: { mediaItem: true, addedBy: { select: { id: true, name: true } } },
  });

  if (tagsToCreate.length > 0) {
    await prisma.listItemTag.createMany({
      data: tagsToCreate.map((tag) => ({
        listItemId: item.id,
        label: tag.label,
        normalized: tag.normalized,
      })),
      // The item may be an upsert of one that already carried these tags.
      skipDuplicates: true,
    });
  }

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
