/**
 * Populates the database with demo users, watch history, and lists for screenshots / development.
 * Wipes and recreates the two demo accounts on every run.
 *
 * Usage: yarn db:seed-demo
 * Requires: DATABASE_URL and TMDB_API_KEY in .env
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  MediaType,
  WatchStatus,
  WatchEntrySource,
  ListRole,
} from "../src/generated/prisma/enums.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// ── helpers ──────────────────────────────────────────────────────────────────

function generateToken(length = 24): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── TMDB ─────────────────────────────────────────────────────────────────────

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

interface TmdbMovie {
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  genres: { id: number; name: string }[];
}

interface TmdbTv {
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  episode_run_time: number[];
  genres: { id: number; name: string }[];
}

async function getOrCreateMovie(tmdbId: number) {
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: MediaType.MOVIE } },
  });
  if (existing) return existing;
  const m = await tmdbFetch<TmdbMovie>(`/movie/${tmdbId}?language=en-US`);
  return prisma.mediaItem.create({
    data: {
      tmdbId,
      type: MediaType.MOVIE,
      title: m.title,
      poster: m.poster_path,
      backdrop: m.backdrop_path,
      year: m.release_date ? new Date(m.release_date).getFullYear() : null,
      overview: m.overview,
      genres: m.genres.map((g) => g.name),
      runtime: m.runtime ?? null,
    },
  });
}

async function getOrCreateTv(tmdbId: number) {
  const existing = await prisma.mediaItem.findUnique({
    where: { tmdbId_type: { tmdbId, type: MediaType.TV } },
  });
  if (existing) return existing;
  const s = await tmdbFetch<TmdbTv>(`/tv/${tmdbId}?language=en-US`);
  return prisma.mediaItem.create({
    data: {
      tmdbId,
      type: MediaType.TV,
      title: s.name,
      poster: s.poster_path,
      backdrop: s.backdrop_path,
      year: s.first_air_date ? new Date(s.first_air_date).getFullYear() : null,
      overview: s.overview,
      genres: s.genres.map((g) => g.name),
      runtime: s.episode_run_time[0] ?? null,
    },
  });
}

async function setStatus(
  userId: string,
  mediaItemId: string,
  status: WatchStatus,
  rating?: number,
  watchedAt?: Date,
) {
  const ums = await prisma.userMediaStatus.upsert({
    where: { userId_mediaItemId: { userId, mediaItemId } },
    update: { status, rating: rating ?? null },
    create: { userId, mediaItemId, status, rating: rating ?? null },
  });
  if (status === WatchStatus.WATCHED && watchedAt) {
    const existing = await prisma.watchEntry.findFirst({
      where: { userId, mediaItemId, source: WatchEntrySource.MANUAL },
    });
    if (!existing) {
      await prisma.watchEntry.create({
        data: {
          userId,
          mediaItemId,
          userMediaStatusId: ums.id,
          watchedAt,
          source: WatchEntrySource.MANUAL,
          rating: rating ?? null,
        },
      });
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding demo data...\n");

  const demoEmails = ["demo@screened.app", "friend@screened.app"];
  const removed = await prisma.user.deleteMany({
    where: { email: { in: demoEmails } },
  });
  if (removed.count > 0)
    console.log(`  Removed ${removed.count} existing demo user(s)`);

  const hashPw = (pw: string) => bcrypt.hash(pw, 12);

  const [alexHash, samHash] = await Promise.all([
    hashPw("screened123"),
    hashPw("screened123"),
  ]);

  const alex = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "demo@screened.app",
      passwordHash: alexHash,
      watchlistRadarrToken: generateToken(24),
      onboardingCompletedAt: new Date(),
    },
    select: { id: true, name: true, email: true },
  });
  const sam = await prisma.user.create({
    data: {
      name: "Sam Chen",
      email: "friend@screened.app",
      passwordHash: samHash,
      watchlistRadarrToken: generateToken(24),
      onboardingCompletedAt: new Date(),
    },
    select: { id: true, name: true, email: true },
  });
  console.log(`  Created: ${alex.name} (${alex.email})`);
  console.log(`  Created: ${sam.name} (${sam.email})`);

  // ── media ────────────────────────────────────────────────────────────────
  console.log("\n  Fetching media from TMDB...");

  const [
    darkKnight,
    inception,
    parasite,
    godfather,
    eeaao,
    interstellar,
    oppenheimer,
    dunePart2,
    poorThings,
    pulpFiction,
  ] = await Promise.all([
    getOrCreateMovie(155), // The Dark Knight
    getOrCreateMovie(27205), // Inception
    getOrCreateMovie(496243), // Parasite
    getOrCreateMovie(238), // The Godfather
    getOrCreateMovie(545611), // Everything Everywhere All at Once
    getOrCreateMovie(157336), // Interstellar
    getOrCreateMovie(872585), // Oppenheimer
    getOrCreateMovie(693134), // Dune: Part Two
    getOrCreateMovie(792307), // Poor Things
    getOrCreateMovie(680), // Pulp Fiction
  ]);

  const [breakingBad, fleabag, succession, severance, theBear] =
    await Promise.all([
      getOrCreateTv(1396), // Breaking Bad
      getOrCreateTv(67178), // Fleabag
      getOrCreateTv(89671), // Succession
      getOrCreateTv(95396), // Severance
      getOrCreateTv(136315), // The Bear
    ]);

  console.log("  Done fetching media.");

  // ── Alex's statuses ──────────────────────────────────────────────────────
  console.log("\n  Setting watch statuses...");

  await Promise.all([
    // movies
    setStatus(alex.id, darkKnight.id, WatchStatus.WATCHED, 5, daysAgo(180)),
    setStatus(alex.id, inception.id, WatchStatus.WATCHED, 4.5, daysAgo(150)),
    setStatus(alex.id, parasite.id, WatchStatus.WATCHED, 5, daysAgo(120)),
    setStatus(alex.id, godfather.id, WatchStatus.WATCHED, 4.5, daysAgo(90)),
    setStatus(alex.id, eeaao.id, WatchStatus.WATCHED, 4, daysAgo(60)),
    setStatus(alex.id, interstellar.id, WatchStatus.WATCHED, 4, daysAgo(30)),
    setStatus(alex.id, oppenheimer.id, WatchStatus.WATCHLIST),
    setStatus(alex.id, dunePart2.id, WatchStatus.WATCHLIST),
    setStatus(alex.id, poorThings.id, WatchStatus.WATCHLIST),
    setStatus(alex.id, pulpFiction.id, WatchStatus.WATCHING),
    // TV
    setStatus(alex.id, breakingBad.id, WatchStatus.WATCHED, 5, daysAgo(100)),
    setStatus(alex.id, fleabag.id, WatchStatus.WATCHED, 5, daysAgo(45)),
    setStatus(alex.id, succession.id, WatchStatus.WATCHING),
    setStatus(alex.id, severance.id, WatchStatus.WATCHLIST),
    setStatus(alex.id, theBear.id, WatchStatus.WATCHLIST),
    // Sam
    setStatus(sam.id, darkKnight.id, WatchStatus.WATCHED, 5, daysAgo(200)),
    setStatus(sam.id, theBear.id, WatchStatus.WATCHED, 5, daysAgo(80)),
    setStatus(sam.id, breakingBad.id, WatchStatus.WATCHLIST),
    setStatus(sam.id, inception.id, WatchStatus.WATCHLIST),
  ]);

  // ── lists ────────────────────────────────────────────────────────────────
  console.log("  Creating lists...");

  const listBest = await prisma.list.create({
    data: {
      name: "Best of the Decade",
      slug: slugify("Best of the Decade"),
      description: "The films that defined the last ten years.",
      isPublic: true,
      ownerId: alex.id,
      radarrToken: generateToken(24),
    },
  });
  await prisma.listItem.createMany({
    data: [
      { listId: listBest.id, mediaItemId: parasite.id, addedById: alex.id },
      { listId: listBest.id, mediaItemId: eeaao.id, addedById: alex.id },
      { listId: listBest.id, mediaItemId: darkKnight.id, addedById: alex.id },
      { listId: listBest.id, mediaItemId: inception.id, addedById: alex.id },
    ],
  });

  const listQueue = await prisma.list.create({
    data: {
      name: "Watch Party Queue",
      slug: slugify("Watch Party Queue"),
      description: "Movies for the next movie night.",
      isPublic: true,
      ownerId: sam.id,
      radarrToken: generateToken(24),
    },
  });
  await prisma.listMember.create({
    data: { listId: listQueue.id, userId: alex.id, role: ListRole.CONTRIBUTOR },
  });
  await prisma.listItem.createMany({
    data: [
      { listId: listQueue.id, mediaItemId: oppenheimer.id, addedById: sam.id },
      { listId: listQueue.id, mediaItemId: dunePart2.id, addedById: sam.id },
      { listId: listQueue.id, mediaItemId: poorThings.id, addedById: sam.id },
    ],
  });

  // ── friendship ───────────────────────────────────────────────────────────
  const [lowId, highId] = [alex.id, sam.id].sort();
  await prisma.friendship.create({
    data: { userLowId: lowId, userHighId: highId },
  });

  // ── summary ──────────────────────────────────────────────────────────────
  console.log("\n✅ Demo seed complete!\n");
  console.log("  Credentials:");
  console.log(`    ${alex.email}   / screened123`);
  console.log(`    ${sam.email} / screened123`);
  console.log("\n  Key URLs for screenshots:");
  console.log("    http://localhost:3000/");
  console.log("    http://localhost:3000/watchlist");
  console.log("    http://localhost:3000/watching");
  console.log("    http://localhost:3000/movies/155");
  console.log("    http://localhost:3000/tv/1396");
  console.log("    http://localhost:3000/history");
  console.log("    http://localhost:3000/lists");
  console.log(`    http://localhost:3000/lists/${listBest.slug}`);
  console.log("    http://localhost:3000/pick");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
