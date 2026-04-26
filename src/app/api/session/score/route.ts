import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getIntersectingPlexMovieTmdbIds } from "@/lib/plex";
import { scoreFromEmbeddedLibrary } from "@/lib/movie-library-score";
import { scoreFromTmdbDiscovery } from "@/lib/movie-discovery-score";
import type { HardFilterInput, ReferenceItem } from "@/lib/score-types";

interface ScoreRequest {
  participantIds: string[];
  attractors: ReferenceItem[];
  repellers: ReferenceItem[];
  hardFilters?: HardFilterInput;
  /** Default "tmdb": TMDB recommendations/similar + embed rank. "library" = only pre-embedded DB rows (legacy). */
  candidateSource?: "tmdb" | "library";
  /** Intersect with participants’ linked Plex movie libraries (per-library intersection). */
  plexLibraryOnly?: boolean;
}

function buildHard(h: ScoreRequest): HardFilterInput {
  return {
    participantIds: h.participantIds,
    minYear: h.hardFilters?.minYear,
    maxYear: h.hardFilters?.maxYear,
    maxRuntime: h.hardFilters?.maxRuntime,
    vetoIds: h.hardFilters?.vetoIds,
    requirePeople: h.hardFilters?.requirePeople,
    excludePeople: h.hardFilters?.excludePeople,
    includeGenres: h.hardFilters?.includeGenres,
    excludeGenres: h.hardFilters?.excludeGenres,
    hideAllLogged: h.hardFilters?.hideAllLogged,
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as ScoreRequest;
  const { participantIds, attractors, repellers } = body;

  if (!participantIds?.length) {
    return NextResponse.json({ error: "At least one participant required" }, { status: 400 });
  }
  if (!attractors?.length) {
    return NextResponse.json({ error: "At least one attractor required" }, { status: 400 });
  }

  const referenceIds = [
    ...attractors.map((a) => a.mediaItemId),
    ...repellers.map((r) => r.mediaItemId),
  ];
  const hard = buildHard(body);
  const source = body.candidateSource ?? "tmdb";

  if (source === "library") {
    const results = await scoreFromEmbeddedLibrary(referenceIds, attractors, repellers, hard);
    if (results.length === 0) {
      const refItems = await prisma.mediaItem.findMany({
        where: { id: { in: attractors.map((a) => a.mediaItemId) } },
        select: { embedding: true },
      });
      const hasNone = !refItems.some((r) => r.embedding.length > 0);
      if (hasNone) {
        return NextResponse.json(
          {
            error:
              "None of the selected reference films have embeddings yet. Use discovery mode, or add OPENAI_API_KEY and re-add references.",
          },
          { status: 422 }
        );
      }
    }
    return NextResponse.json({ results, total: results.length });
  }

  let plexTmdbIds: Set<number> | null = null;
  if (body.plexLibraryOnly) {
    const plexR = await getIntersectingPlexMovieTmdbIds(participantIds);
    if (plexR.kind === "none") {
      return NextResponse.json(
        {
          error:
            "At least one participant must link Plex in settings to limit suggestions by library.",
        },
        { status: 422 }
      );
    }
    plexTmdbIds = plexR.ids;
  }

  const disc = await scoreFromTmdbDiscovery(attractors, repellers, hard, {
    plexLibraryOnly: !!body.plexLibraryOnly,
    plexTmdbIds,
  });
  if (!Array.isArray(disc)) {
    return NextResponse.json({ error: disc.error }, { status: 422 });
  }
  if (disc.length === 0) {
    return NextResponse.json({
      results: [],
      total: 0,
      message:
        "No candidates passed your filters. Try relaxing year/runtime or genres, turning off the Plex limit, or check TMDB for similar/recommendation results for your title.",
    });
  }
  return NextResponse.json({ results: disc, total: disc.length });
}
