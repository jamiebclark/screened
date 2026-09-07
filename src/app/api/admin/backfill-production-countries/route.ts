import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { prisma } from "@/lib/prisma";
import { getMovie, getTvShow } from "@/lib/tmdb";
import { parseBackfillLimit } from "@/lib/production-countries";
import { MediaType } from "@/generated/prisma";

/**
 * One-off backfill for MediaItem.productionCountries.
 *
 * Enrichment fills this in lazily, but only as each item happens to be
 * touched, which leaves an existing library mostly blank. This walks the rows
 * that are still empty and fetches them directly.
 *
 * Deliberately batched: it costs one TMDB call per item, so callers page
 * through with `limit` until `remaining` reaches 0 rather than issuing one
 * unbounded request that would sit on the rate limit and risk timing out
 * halfway with no record of how far it got.
 *
 * Lives as a route rather than a script because the production image copies
 * only .next, prisma, package.json and src/generated — scripts/ is not there.
 */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSiteAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** Progress check: how many items still lack country data. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [remaining, total] = await Promise.all([
      prisma.mediaItem.count({
        where: { productionCountries: { equals: [] } },
      }),
      prisma.mediaItem.count(),
    ]);
    return NextResponse.json({ remaining, total, filled: total - remaining });
  } catch (err) {
    console.error("[backfill-production-countries] count failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const limit = parseBackfillLimit(searchParams.get("limit"));

  let batch;
  try {
    batch = await prisma.mediaItem.findMany({
      where: { productionCountries: { equals: [] } },
      select: { id: true, tmdbId: true, type: true, title: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  } catch (err) {
    console.error("[backfill-production-countries] query failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  let updated = 0;
  let noCountryData = 0;
  const failures: { tmdbId: number; title: string }[] = [];

  for (const item of batch) {
    try {
      const codes =
        item.type === MediaType.MOVIE
          ? await getMovie(item.tmdbId).then((m) => m.production_country_codes)
          : await getTvShow(item.tmdbId).then(
              (s) => s.production_country_codes,
            );

      if (codes.length === 0) {
        // TMDB genuinely has nothing for this title. Left empty so a later run
        // retries it rather than recording a wrong answer.
        noCountryData += 1;
        continue;
      }

      await prisma.mediaItem.update({
        where: { id: item.id },
        data: { productionCountries: codes },
      });
      updated += 1;
    } catch (err) {
      // One bad title must not abort the batch; report it and carry on.
      console.error(
        `[backfill-production-countries] ${item.type} ${item.tmdbId} failed:`,
        err,
      );
      failures.push({ tmdbId: item.tmdbId, title: item.title });
    }
  }

  const remaining = await prisma.mediaItem.count({
    where: { productionCountries: { equals: [] } },
  });

  return NextResponse.json({
    processed: batch.length,
    updated,
    noCountryData,
    failed: failures.length,
    failures: failures.slice(0, 20),
    remaining,
    done: batch.length === 0,
  });
}
