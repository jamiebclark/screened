import { prisma } from "@/lib/prisma";

export type OmdbRatingEntry = {
  source: string;
  value: string;
};

const OMDB_BASE = "https://www.omdbapi.com/";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getApiKey(): string | null {
  const k = process.env.OMDB_API_KEY?.trim();
  return k || null;
}

/** True when hosted env should attempt OMDb fetches. */
export function isOmdbConfigured(): boolean {
  return getApiKey() !== null;
}

function normalizeOmdbRating(raw: unknown): OmdbRatingEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { Source?: unknown; Value?: unknown };
  const source = typeof r.Source === "string" ? r.Source.trim() : "";
  const value = typeof r.Value === "string" ? r.Value.trim() : "";
  if (!source || !value) return null;
  return { source, value };
}

function parseCachedRatings(json: unknown): OmdbRatingEntry[] {
  if (!Array.isArray(json)) return [];
  return json
    .map(normalizeOmdbRating)
    .filter((x): x is OmdbRatingEntry => x !== null);
}

type OmdbApiResponse = {
  Response?: string;
  Error?: string;
  Ratings?: { Source: string; Value: string }[];
};

async function fetchOmdbByImdbId(
  imdbId: string,
  apiKey: string,
): Promise<OmdbApiResponse | null> {
  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("i", imdbId);
  url.searchParams.set("r", "json");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;
  return res.json() as Promise<OmdbApiResponse>;
}

/**
 * Returns aggregated scores from OMDb (e.g. Rotten Tomatoes, Metacritic) when the API key is set
 * and an IMDb id is available. Caches in Postgres; uses stale cache on fetch failure. Otherwise null.
 */
export async function getCachedOmdbRatings(
  imdbId: string | null | undefined,
): Promise<OmdbRatingEntry[] | null> {
  if (!imdbId || !imdbId.startsWith("tt")) return null;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  const now = Date.now();
  const row = await prisma.omdbRatingCache
    .findUnique({ where: { imdbId } })
    .catch(() => null);
  const fresh =
    row && now - row.fetchedAt.getTime() < CACHE_TTL_MS
      ? parseCachedRatings(row.ratings)
      : null;

  if (fresh && fresh.length > 0) {
    return fresh;
  }

  let remote: OmdbApiResponse | null = null;
  try {
    remote = await fetchOmdbByImdbId(imdbId, apiKey);
  } catch {
    remote = null;
  }

  if (
    remote?.Response === "True" &&
    Array.isArray(remote.Ratings) &&
    remote.Ratings.length > 0
  ) {
    const list = remote.Ratings.map(normalizeOmdbRating).filter(
      (x): x is OmdbRatingEntry => x !== null,
    );
    if (list.length > 0) {
      await prisma.omdbRatingCache
        .upsert({
          where: { imdbId },
          create: {
            imdbId,
            ratings: remote.Ratings as object[],
            fetchedAt: new Date(),
          },
          update: {
            ratings: remote.Ratings as object[],
            fetchedAt: new Date(),
          },
        })
        .catch(() => {
          // ignore persist errors; still return fresh remote data
        });
      return list;
    }
  }

  if (row) {
    const stale = parseCachedRatings(row.ratings);
    if (stale.length > 0) return stale;
  }

  return null;
}
