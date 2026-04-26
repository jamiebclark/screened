import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { weightedAverage, cosineSimilarity } from "@/lib/embeddings";
import { MediaType, WatchStatus } from "@/generated/prisma";

interface ReferenceItem {
  mediaItemId: string;
  weight: number;
}

interface HardFilters {
  minYear?: number;
  maxRuntime?: number;
  vetoIds?: string[];
  requirePeople?: string[];
  excludePeople?: string[];
  hideAllLogged?: boolean;
}

interface ScoreRequest {
  participantIds: string[];
  attractors: ReferenceItem[];
  repellers: ReferenceItem[];
  hardFilters?: HardFilters;
}

const REPELLER_LAMBDA = 0.7;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ScoreRequest;
  const { participantIds, attractors, repellers, hardFilters } = body;

  if (!participantIds?.length) {
    return NextResponse.json({ error: "At least one participant required" }, { status: 400 });
  }

  if (!attractors?.length) {
    return NextResponse.json({ error: "At least one attractor required" }, { status: 400 });
  }

  // Fetch embeddings for reference movies
  const referenceIds = [
    ...attractors.map((a) => a.mediaItemId),
    ...repellers.map((r) => r.mediaItemId),
  ];

  const referenceItems = await prisma.mediaItem.findMany({
    where: { id: { in: referenceIds } },
    select: { id: true, embedding: true },
  });

  const embeddingMap = new Map(referenceItems.map((r) => [r.id, r.embedding]));

  // Build weighted average vectors
  const attractorEntries = attractors
    .map((a) => ({ vector: embeddingMap.get(a.mediaItemId) ?? [], weight: a.weight }))
    .filter((e) => e.vector.length > 0);

  const repellerEntries = repellers
    .map((r) => ({ vector: embeddingMap.get(r.mediaItemId) ?? [], weight: r.weight }))
    .filter((e) => e.vector.length > 0);

  if (attractorEntries.length === 0) {
    return NextResponse.json(
      { error: "None of the selected reference films have embeddings yet. Please ensure an OpenAI API key is configured." },
      { status: 422 }
    );
  }

  const attractorVec = weightedAverage(attractorEntries);
  const repellerVec = repellerEntries.length > 0 ? weightedAverage(repellerEntries) : null;

  // Get logged movie IDs for all participants
  const loggedStatuses = await prisma.userMediaStatus.findMany({
    where: {
      userId: { in: participantIds },
      ...(hardFilters?.hideAllLogged ? {} : { status: WatchStatus.WATCHED }),
    },
    select: { mediaItemId: true },
  });
  const watchedIds = new Set(loggedStatuses.map((s) => s.mediaItemId));

  // Also exclude veto IDs
  const vetoSet = new Set(hardFilters?.vetoIds ?? []);

  // Also exclude the reference movies themselves
  const referenceSet = new Set(referenceIds);

  // Fetch all candidate movies with embeddings
  const candidates = await prisma.mediaItem.findMany({
    where: {
      type: MediaType.MOVIE,
      embedding: { isEmpty: false },
      ...(hardFilters?.minYear ? { year: { gte: hardFilters.minYear } } : {}),
      ...(hardFilters?.maxRuntime ? { runtime: { lte: hardFilters.maxRuntime } } : {}),
    },
    select: {
      id: true,
      tmdbId: true,
      title: true,
      poster: true,
      year: true,
      runtime: true,
      genres: true,
      overview: true,
      cast: true,
      director: true,
      embedding: true,
    },
  });

  const requirePeople = (hardFilters?.requirePeople ?? []).map((p) => p.toLowerCase());
  const excludePeople = (hardFilters?.excludePeople ?? []).map((p) => p.toLowerCase());

  const matchesPerson = (c: { cast: string[]; director: string | null }, name: string) => {
    const all = [...c.cast, ...(c.director ? [c.director] : [])].map((s) => s.toLowerCase());
    return all.some((s) => s.includes(name));
  };

  // Score each candidate
  const scored = candidates
    .filter((c) => {
      if (watchedIds.has(c.id) || vetoSet.has(c.id) || referenceSet.has(c.id)) return false;
      if (requirePeople.length > 0 && !requirePeople.every((name) => matchesPerson(c, name))) return false;
      if (excludePeople.length > 0 && excludePeople.some((name) => matchesPerson(c, name))) return false;
      return true;
    })
    .map((c) => {
      const attractorScore = cosineSimilarity(c.embedding, attractorVec);
      const repellerScore = repellerVec ? cosineSimilarity(c.embedding, repellerVec) : 0;
      const score = attractorScore - REPELLER_LAMBDA * repellerScore;
      return {
        id: c.id,
        tmdbId: c.tmdbId,
        title: c.title,
        poster: c.poster,
        year: c.year,
        runtime: c.runtime,
        genres: c.genres,
        overview: c.overview,
        cast: c.cast.slice(0, 3),
        director: c.director,
        score: Math.round(score * 1000) / 1000,
        attractorScore: Math.round(attractorScore * 1000) / 1000,
        repellerScore: Math.round(repellerScore * 1000) / 1000,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  return NextResponse.json({ results: scored, total: scored.length });
}
