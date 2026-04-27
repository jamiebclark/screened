import { prisma } from "@/lib/prisma";
import { imdbTitleUrl } from "@/lib/movie-catalog-links";
import { metacriticTitlePathUrl } from "@/lib/metacritic-url";

export type OmdbRatingEntry = {
  source: string;
  value: string;
};

export type OmdbRatingsBlock = {
  ratings: OmdbRatingEntry[];
  /**
   * From OMDb `tomatoURL` when `tomatoes=true` is used. Omitted or wrong in some API responses;
   * {@link buildOmdbSourceHref} falls back to a Rotten Tomatoes search for the display title.
   */
  rottenTomatoesUrl: string | null;
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

function normalizeHttpUrl(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return null;
  try {
    return new URL(t).toString();
  } catch {
    return null;
  }
}

type OmdbApiResponse = {
  Response?: string;
  Error?: string;
  Ratings?: { Source: string; Value: string }[];
  /** Present when `tomatoes=true` is accepted by the API */
  tomatoURL?: string;
};

async function fetchOmdbByImdbId(
  imdbId: string,
  apiKey: string,
): Promise<OmdbApiResponse | null> {
  const url = new URL(OMDB_BASE);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("i", imdbId);
  url.searchParams.set("r", "json");
  url.searchParams.set("tomatoes", "true");

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
): Promise<OmdbRatingsBlock | null> {
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
    return {
      ratings: fresh,
      rottenTomatoesUrl: row?.rottenTomatoesUrl ?? null,
    };
  }

  let remote: OmdbApiResponse | null = null;
  try {
    remote = await fetchOmdbByImdbId(imdbId, apiKey);
  } catch {
    remote = null;
  }

  const fromTomato = normalizeHttpUrl(remote?.tomatoURL) ?? null;

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
            rottenTomatoesUrl: fromTomato,
            fetchedAt: new Date(),
          },
          update: {
            ratings: remote.Ratings as object[],
            rottenTomatoesUrl: fromTomato,
            fetchedAt: new Date(),
          },
        })
        .catch(() => {
          // ignore persist errors; still return fresh remote data
        });
      return { ratings: list, rottenTomatoesUrl: fromTomato };
    }
  }

  if (row) {
    const stale = parseCachedRatings(row.ratings);
    if (stale.length > 0) {
      return {
        ratings: stale,
        rottenTomatoesUrl: row.rottenTomatoesUrl ?? null,
      };
    }
  }

  return null;
}

type HrefContext = {
  imdbId: string | null;
  linkTitle: string;
  mediaType: "movie" | "tv";
  rottenTomatoesUrl: string | null;
};

/**
 * OMDb does not provide URLs in the `Ratings` array. We use `tomatoURL` when available,
 * {@link imdbTitleUrl} for the IMDb line, a slugified Metacritic path, and RT search as fallback.
 */
export function buildOmdbSourceHref(
  source: string,
  ctx: HrefContext,
): string | null {
  if (source === "Internet Movie Database") {
    return imdbTitleUrl(ctx.imdbId);
  }
  if (source === "Rotten Tomatoes") {
    if (ctx.rottenTomatoesUrl) {
      return ctx.rottenTomatoesUrl;
    }
    if (ctx.linkTitle.trim()) {
      return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(
        ctx.linkTitle.trim(),
      )}`;
    }
    return null;
  }
  if (source === "Metacritic") {
    if (ctx.linkTitle.trim()) {
      return metacriticTitlePathUrl(ctx.linkTitle.trim(), ctx.mediaType);
    }
    return null;
  }
  return null;
}
