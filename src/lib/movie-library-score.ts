import { prisma } from "@/lib/prisma";
import { weightedAverage, cosineSimilarity } from "@/lib/embeddings";
import { MediaType, WatchStatus } from "@/generated/prisma";
import type { ScoredRow, HardFilterInput, ReferenceItem } from "./score-types";
import { passesGenreFilters } from "./genre-filters";

// Repeller penalty weight (same tuning as movie-discovery-score): score = attractor − LAMBDA × repeller.
const REPELLER_LAMBDA = 0.7;

export async function scoreFromEmbeddedLibrary(
  referenceIds: string[],
  attractors: ReferenceItem[],
  repellers: ReferenceItem[],
  hard: HardFilterInput,
): Promise<ScoredRow[]> {
  const referenceItems = await prisma.mediaItem.findMany({
    where: { id: { in: referenceIds } },
    select: { id: true, embedding: true },
  });
  const embeddingMap = new Map(referenceItems.map((r) => [r.id, r.embedding]));

  const attractorEntries = attractors
    .map((a) => ({
      vector: embeddingMap.get(a.mediaItemId) ?? [],
      weight: a.weight,
    }))
    .filter((e) => e.vector.length > 0);
  const repellerEntries = repellers
    .map((r) => ({
      vector: embeddingMap.get(r.mediaItemId) ?? [],
      weight: r.weight,
    }))
    .filter((e) => e.vector.length > 0);

  if (attractorEntries.length === 0) {
    return [];
  }

  const attractorVec = weightedAverage(attractorEntries);
  const repellerVec =
    repellerEntries.length > 0 ? weightedAverage(repellerEntries) : null;

  const statusWhere = hard.hideAllLogged ? {} : { status: WatchStatus.WATCHED };
  const loggedStatuses = await prisma.userMediaStatus.findMany({
    where: {
      userId: { in: hard.participantIds },
      ...statusWhere,
    },
    select: { mediaItemId: true },
  });
  const watchedIds = new Set(loggedStatuses.map((s) => s.mediaItemId));
  const vetoSet = new Set(hard.vetoIds ?? []);
  const referenceSet = new Set(referenceIds);

  const yearFilter: { gte?: number; lte?: number } = {};
  if (hard.minYear != null) yearFilter.gte = hard.minYear;
  if (hard.maxYear != null) yearFilter.lte = hard.maxYear;
  if (
    yearFilter.gte != null &&
    yearFilter.lte != null &&
    yearFilter.gte > yearFilter.lte
  ) {
    [yearFilter.gte, yearFilter.lte] = [yearFilter.lte, yearFilter.gte];
  }
  const yearWhere =
    Object.keys(yearFilter).length > 0 ? { year: yearFilter } : {};

  const candidates = await prisma.mediaItem.findMany({
    where: {
      type: MediaType.MOVIE,
      embedding: { isEmpty: false },
      ...yearWhere,
      ...(hard.maxRuntime != null ? { runtime: { lte: hard.maxRuntime } } : {}),
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

  const requirePeople = (hard.requirePeople ?? []).map((p) => p.toLowerCase());
  const excludePeople = (hard.excludePeople ?? []).map((p) => p.toLowerCase());

  const matchesPerson = (
    c: { cast: string[]; director: string | null },
    name: string,
  ) => {
    const all = [...c.cast, ...(c.director ? [c.director] : [])].map((s) =>
      s.toLowerCase(),
    );
    return all.some((s) => s.includes(name));
  };

  return candidates
    .filter((c) => {
      if (watchedIds.has(c.id) || vetoSet.has(c.id) || referenceSet.has(c.id))
        return false;
      if (
        requirePeople.length > 0 &&
        !requirePeople.every((name) => matchesPerson(c, name))
      )
        return false;
      if (
        excludePeople.length > 0 &&
        excludePeople.some((name) => matchesPerson(c, name))
      )
        return false;
      if (!passesGenreFilters(c.genres, hard.includeGenres, hard.excludeGenres))
        return false;
      return true;
    })
    .map((c) => {
      const attractorScore = cosineSimilarity(c.embedding, attractorVec);
      const repellerScore = repellerVec
        ? cosineSimilarity(c.embedding, repellerVec)
        : 0;
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
}
