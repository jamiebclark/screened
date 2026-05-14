import { prisma } from "@/lib/prisma";
import {
  getMovieRecommendations,
  getMovieSimilar,
  getMovieWithDetails,
} from "@/lib/tmdb";
import {
  buildEmbeddingText,
  cosineSimilarity,
  generateEmbedding,
  isEmbeddingEnabled,
  weightedAverage,
} from "@/lib/embeddings";
import { MediaType, WatchStatus } from "@/generated/prisma";
import type { HardFilterInput, ReferenceItem, ScoredRow } from "./score-types";
import { passesGenreFilters } from "./genre-filters";

// Repeller penalty weight: score = attractorSim − LAMBDA × repellerSim.
// 0.7 lets a strong attractor match outrank a mild repeller hit; raising above 1.0
// would make any repeller overlap dominate the ranking.
const REPELLER_LAMBDA = 0.7;
const MAX_TMDB_CANDIDATES = 200;
// Embedding generation is the API bottleneck — cap per-run to stay under rate limits
// and keep p50 latency acceptable. Doubled when a wide candidate pool is needed.
const MAX_TO_EMBED = 48;
const RESULTS = 30;

export function yearFromTmdbDate(
  release: string | null | undefined,
): number | null {
  if (!release) return null;
  const y = new Date(release).getFullYear();
  return Number.isFinite(y) ? y : null;
}

export function yearInRange(
  y: number | null,
  minY: number | undefined,
  maxY: number | undefined,
): boolean {
  if (y == null) return true;
  if (minY != null && y < minY) return false;
  if (maxY != null && y > maxY) return false;
  return true;
}

export function matchesPerson(
  cast: string[],
  director: string | null,
  name: string,
  directors: string[] = [],
): boolean {
  const dList = directors.length > 0 ? directors : director ? [director] : [];
  const all = [...cast, ...dList].map((s) => s.toLowerCase());
  return all.some((s) => s.includes(name));
}

async function mapPool<T, R>(
  items: T[],
  poolSize: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += poolSize) {
    const batch = items.slice(i, i + poolSize);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

/** Ensure all reference items have a stored embedding; build aggregate vectors. */
async function getReferenceVectors(
  attractors: ReferenceItem[],
  repellers: ReferenceItem[],
) {
  const referenceIds = [
    ...attractors.map((a) => a.mediaItemId),
    ...repellers.map((r) => r.mediaItemId),
  ];
  if (!isEmbeddingEnabled()) {
    return { ok: false as const, error: "no_embeddings" as const };
  }

  const rows = await prisma.mediaItem.findMany({
    where: { id: { in: referenceIds } },
    select: {
      id: true,
      tmdbId: true,
      embedding: true,
      title: true,
      year: true,
      overview: true,
      genres: true,
      runtime: true,
      cast: true,
      director: true,
      keywords: true,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  for (const id of referenceIds) {
    const row = byId.get(id);
    if (!row) continue;
    if (row.embedding.length > 0) continue;

    const { movie, credits, keywords } = await getMovieWithDetails(row.tmdbId);
    const title = movie.title;
    const year = movie.release_date
      ? new Date(movie.release_date).getFullYear()
      : null;
    const overview = movie.overview;
    const genres = movie.genres.map((g) => g.name);
    const cast = credits.cast;
    const director = credits.director;
    const text = buildEmbeddingText({
      title,
      year,
      overview,
      genres,
      cast,
      director,
      keywords,
    });
    const emb = await generateEmbedding(text);
    if (!emb) {
      return { ok: false as const, error: "embed_failed" as const };
    }
    const updated = await prisma.mediaItem.update({
      where: { id: row.id },
      data: {
        title,
        year,
        overview,
        genres,
        runtime: movie.runtime,
        cast,
        director,
        keywords,
        embedding: emb,
        poster: movie.poster_path,
      },
    });
    byId.set(id, { ...row, ...updated, embedding: emb });
  }

  const attractorEntries = attractors
    .map((a) => ({
      vector: byId.get(a.mediaItemId)?.embedding ?? [],
      weight: a.weight,
    }))
    .filter((e) => e.vector.length > 0);
  const repellerEntries = repellers
    .map((r) => ({
      vector: byId.get(r.mediaItemId)?.embedding ?? [],
      weight: r.weight,
    }))
    .filter((e) => e.vector.length > 0);

  if (attractorEntries.length === 0) {
    return { ok: false as const, error: "no_attractor_vectors" as const };
  }

  return {
    ok: true as const,
    attractorVec: weightedAverage(attractorEntries),
    repellerVec:
      repellerEntries.length > 0 ? weightedAverage(repellerEntries) : null,
  };
}

/** TMDB id → first-seen list row (for quick year prefilter). */
async function collectTmdbCandidateMap(
  attractorTmdbIds: number[],
  wide: boolean,
): Promise<Map<number, { release_date?: string }>> {
  const out = new Map<number, { release_date?: string }>();
  const listPages = wide ? ([1, 2, 3, 4] as const) : ([1, 2] as const);
  for (const aid of attractorTmdbIds) {
    const listResults = await Promise.all(
      listPages.flatMap((p) => [
        getMovieRecommendations(aid, p),
        getMovieSimilar(aid, p),
      ]),
    );
    for (const p of listResults) {
      for (const m of p.results) {
        if (!m.id || out.has(m.id)) continue;
        if (
          "name" in m &&
          (m as { name?: string }).name &&
          !("title" in m && (m as { title?: string }).title)
        ) {
          continue;
        }
        out.set(m.id, { release_date: m.release_date });
      }
    }
    if (out.size >= MAX_TMDB_CANDIDATES) break;
  }
  return out;
}

export async function scoreFromTmdbDiscovery(
  attractors: ReferenceItem[],
  repellers: ReferenceItem[],
  hard: HardFilterInput,
  opts: { plexLibraryOnly: boolean; plexTmdbIds: Set<number> | null },
): Promise<ScoredRow[] | { error: string }> {
  if (!isEmbeddingEnabled()) {
    return { error: "Add OPENAI_API_KEY to use discovery scoring." };
  }

  const refVecs = await getReferenceVectors(attractors, repellers);
  if (!refVecs.ok) {
    if (
      refVecs.error === "no_embeddings" ||
      refVecs.error === "no_attractor_vectors"
    ) {
      return {
        error:
          "Could not build embeddings for your reference films. Add OPENAI_API_KEY or wait for them to process.",
      };
    }
    return {
      error: "Embedding failed for a reference title. Try again in a moment.",
    };
  }
  const { attractorVec, repellerVec } = refVecs;

  const referenceIds = [
    ...attractors.map((a) => a.mediaItemId),
    ...repellers.map((r) => r.mediaItemId),
  ];
  const refTmdb = await prisma.mediaItem.findMany({
    where: { id: { in: referenceIds } },
    select: { tmdbId: true },
  });
  const excludeTmdb = new Set(refTmdb.map((r) => r.tmdbId));

  if (hard.vetoIds?.length) {
    const vetoT = await prisma.mediaItem.findMany({
      where: { id: { in: hard.vetoIds } },
      select: { tmdbId: true },
    });
    for (const v of vetoT) excludeTmdb.add(v.tmdbId);
  }

  const statusWhere = hard.hideAllLogged ? {} : { status: WatchStatus.WATCHED };
  const logged = await prisma.userMediaStatus.findMany({
    where: { userId: { in: hard.participantIds }, ...statusWhere },
    select: { mediaItem: { select: { tmdbId: true } } },
  });
  const watchedTmdb = new Set(logged.map((l) => l.mediaItem.tmdbId));

  const attractorTmdbIds = (
    await prisma.mediaItem.findMany({
      where: { id: { in: attractors.map((a) => a.mediaItemId) } },
      select: { tmdbId: true },
    })
  ).map((r) => r.tmdbId);

  const hasPersonFilter =
    (hard.requirePeople?.length ?? 0) > 0 ||
    (hard.excludePeople?.length ?? 0) > 0;
  const hasGenreFilter =
    (hard.includeGenres?.length ?? 0) > 0 ||
    (hard.excludeGenres?.length ?? 0) > 0;
  const wideCandidatePool = hasPersonFilter || hasGenreFilter;
  const tmdbInfo = await collectTmdbCandidateMap(
    attractorTmdbIds,
    wideCandidatePool,
  );

  const plexTmdb = opts.plexLibraryOnly ? opts.plexTmdbIds : null;
  if (opts.plexLibraryOnly && !plexTmdb) {
    return {
      error: "Connect Plex in settings to limit suggestions to your library.",
    };
  }

  const minY = hard.minYear;
  const maxY = hard.maxYear;

  /** Wider pool when filters shrink the list — need more similar/recommendation rows before details. */
  const preDetailLimit = wideCandidatePool
    ? MAX_TMDB_CANDIDATES
    : MAX_TO_EMBED * 2;

  const candidateTmdb: number[] = [];
  for (const [tmdb, meta] of tmdbInfo) {
    if (excludeTmdb.has(tmdb)) continue;
    if (watchedTmdb.has(tmdb)) continue;
    const y = yearFromTmdbDate(meta.release_date);
    if (!yearInRange(y, minY, maxY)) continue;
    if (plexTmdb && !plexTmdb.has(tmdb)) continue;
    candidateTmdb.push(tmdb);
    if (candidateTmdb.length >= preDetailLimit) break;
  }

  if (candidateTmdb.length === 0) {
    return [];
  }

  const details = await mapPool(candidateTmdb, 4, async (tmdb) => {
    const { movie, credits, keywords: kws } = await getMovieWithDetails(tmdb);
    return { tmdb, movie, credits, kws };
  });

  const require = (hard.requirePeople ?? []).map((p) => p.toLowerCase());
  const exclude = (hard.excludePeople ?? []).map((p) => p.toLowerCase());

  const filtered: typeof details = [];
  for (const d of details) {
    const { movie, credits } = d;
    const y = yearFromTmdbDate(movie.release_date);
    if (!yearInRange(y, minY, maxY)) continue;
    if (
      hard.maxRuntime != null &&
      (movie.runtime == null || movie.runtime > hard.maxRuntime)
    ) {
      continue;
    }
    if (require.length > 0) {
      if (
        !require.every((n) =>
          matchesPerson(credits.cast, credits.director, n, credits.directors),
        )
      ) {
        continue;
      }
    }
    if (exclude.length > 0) {
      if (
        exclude.some((n) =>
          matchesPerson(credits.cast, credits.director, n, credits.directors),
        )
      ) {
        continue;
      }
    }
    const genreNames = movie.genres.map((g) => g.name);
    if (
      !passesGenreFilters(genreNames, hard.includeGenres, hard.excludeGenres)
    ) {
      continue;
    }
    filtered.push(d);
  }

  if (filtered.length === 0) {
    return [];
  }

  const toEmbed = filtered.slice(0, MAX_TO_EMBED);
  type ScoredW = {
    row: ScoredRow;
    embedding: number[];
    db: (typeof toEmbed)[0];
  };
  const scored: ScoredW[] = [];

  for (let i = 0; i < toEmbed.length; i += 5) {
    const batch = toEmbed.slice(i, i + 5);
    const vecResults = await Promise.all(
      batch.map(async (d) => {
        const { movie, credits, kws } = d;
        const title = movie.title;
        const year = yearFromTmdbDate(movie.release_date);
        const text = buildEmbeddingText({
          title,
          year,
          overview: movie.overview,
          genres: movie.genres.map((g) => g.name),
          cast: credits.cast,
          director: credits.director,
          keywords: kws,
        });
        const v = await generateEmbedding(text);
        return { d, v };
      }),
    );
    for (const { d, v } of vecResults) {
      if (!v || v.length === 0) continue;
      const { movie, credits, tmdb } = d;
      const attractorScore = cosineSimilarity(v, attractorVec);
      const repellerScore = repellerVec ? cosineSimilarity(v, repellerVec) : 0;
      const score = attractorScore - REPELLER_LAMBDA * repellerScore;
      const y = yearFromTmdbDate(movie.release_date);
      const genres = movie.genres.map((g) => g.name);
      scored.push({
        embedding: v,
        db: d,
        row: {
          tmdbId: tmdb,
          id: "",
          title: movie.title,
          poster: movie.poster_path,
          year: y,
          runtime: movie.runtime,
          genres,
          overview: movie.overview,
          cast: credits.cast.slice(0, 3),
          director: credits.director,
          score: Math.round(score * 1000) / 1000,
          attractorScore: Math.round(attractorScore * 1000) / 1000,
          repellerScore: Math.round(repellerScore * 1000) / 1000,
        },
      });
    }
  }

  const sorted = scored
    .sort((a, b) => b.row.score - a.row.score)
    .slice(0, RESULTS);

  const out: ScoredRow[] = [];
  for (const s of sorted) {
    const { row, embedding, db } = s;
    const mediaRow = await prisma.mediaItem.upsert({
      where: { tmdbId_type: { tmdbId: row.tmdbId, type: MediaType.MOVIE } },
      create: {
        tmdbId: row.tmdbId,
        type: MediaType.MOVIE,
        title: row.title,
        poster: row.poster,
        year: row.year,
        overview: row.overview,
        genres: row.genres,
        runtime: row.runtime,
        cast: db.credits.cast,
        director: row.director,
        keywords: db.kws,
        embedding,
      },
      update: {
        title: row.title,
        poster: row.poster,
        year: row.year,
        overview: row.overview,
        genres: row.genres,
        runtime: row.runtime,
        cast: db.credits.cast,
        director: row.director,
        keywords: db.kws,
        embedding,
      },
    });
    out.push({ ...row, id: mediaRow.id });
  }

  return out;
}
