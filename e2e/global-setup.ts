import { Client } from "pg";

/**
 * Seeds the MediaItem rows the e2e suite references.
 *
 * `getOrCreateMediaItem` (list items) and `getOrCreateTvItem` (episodes) both
 * look the row up by (tmdbId, type) and only call TMDB when it is missing. So
 * seeding these rows lets the suite run against a placeholder TMDB_API_KEY,
 * which is what CI has — the alternative is every spec that adds a title
 * failing on a 502 from the TMDB fetch.
 *
 * It does NOT remove every TMDB dependency: pages that fetch on each request,
 * such as the TV season list on /tv/[tmdbId] or /api/search, still need a real
 * key. Specs relying on those are skipped unless E2E_LIVE_TMDB=1 (see
 * requiresLiveTmdb in ./helpers).
 *
 * Titles match what the specs assert, so keep them in step with the specs.
 */
const MOVIES: [tmdbId: number, title: string, year: number][] = [
  [11, "Star Wars", 1977],
  [12, "Finding Nemo", 2003],
  [13, "Forrest Gump", 1994],
  [120, "The Lord of the Rings: The Fellowship of the Ring", 2001],
  [121, "The Lord of the Rings: The Two Towers", 2002],
  [122, "The Lord of the Rings: The Return of the King", 2003],
  [155, "The Dark Knight", 2008],
  [550, "Fight Club", 1999],
  [603, "The Matrix", 1999],
  [604, "The Matrix Reloaded", 2003],
  [605, "The Matrix Revolutions", 2003],
  [671, "Harry Potter and the Philosopher's Stone", 2001],
  [672, "Harry Potter and the Chamber of Secrets", 2002],
  [807, "Se7en", 1995],
  [24428, "The Avengers", 2012],
  [27205, "Inception", 2010],
  [76341, "Mad Max: Fury Road", 2015],
  [118340, "Guardians of the Galaxy", 2014],
  [157336, "Interstellar", 2014],
  [293660, "Deadpool", 2016],
  [335984, "Blade Runner 2049", 2017],
];

const SHOWS: [tmdbId: number, title: string, year: number][] = [
  [1396, "Breaking Bad", 2008],
];

export default async function globalSetup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set; the e2e suite needs a database to seed.",
    );
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (const [rows, type] of [
      [MOVIES, "MOVIE"],
      [SHOWS, "TV"],
    ] as const) {
      for (const [tmdbId, title, year] of rows) {
        // Leave an existing row alone apart from the title: a previous run may
        // have enriched it from a real TMDB response, and overwriting that with
        // our stub would lose poster and overview data the pages render.
        await client.query(
          `INSERT INTO "MediaItem" (id, "tmdbId", type, title, year, "updatedAt")
           VALUES ($1, $2, $3::"MediaType", $4, $5, now())
           ON CONFLICT ("tmdbId", type) DO UPDATE SET title = EXCLUDED.title`,
          [`e2e_${type.toLowerCase()}_${tmdbId}`, tmdbId, type, title, year],
        );
      }
    }
  } finally {
    await client.end();
  }
}
