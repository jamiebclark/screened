import { prisma } from "@/lib/prisma";
import { WatchEntrySource, type WatchEntry } from "@/generated/prisma";
import type { PrismaClient } from "@/generated/prisma";

type WatchEntryDelegate = Pick<PrismaClient, "watchEntry">;

/** Start of the UTC calendar day for `d`. */
export function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Start of the next UTC calendar day after `d` (exclusive upper bound for range queries). */
export function utcDayEndExclusive(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
}

/**
 * Picks the entry whose `watchedAt` is closest in time to `candidate`.
 * Use when more than one watch exists for the same title on the same UTC day
 * (e.g. double feature) so a sync can merge into the most likely row.
 */
export function pickClosestByWatchedTime<T extends { watchedAt: Date }>(
  entries: T[],
  candidate: Date,
): T | null {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0]!;
  const t = candidate.getTime();
  let best = entries[0]!;
  let bestDist = Math.abs(best.watchedAt.getTime() - t);
  for (let i = 1; i < entries.length; i++) {
    const e = entries[i]!;
    const d = Math.abs(e.watchedAt.getTime() - t);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Finds an existing `WatchEntry` a sync or import should update instead of creating:
 * 1) exact `watchedAt` match (same user + title),
 * 2) else the closest-in-time entry on the same **UTC** calendar day (manual vs Letterboxd vs Plex
 *    often differ by hours).
 *
 * Use `db` in a `prisma.$transaction` so tagging + merge checks use the same snapshot.
 */
export async function findMergeCandidateWatchEntry(
  userId: string,
  mediaItemId: string,
  watchedAt: Date,
  db: WatchEntryDelegate = prisma,
): Promise<WatchEntry | null> {
  const exact = await db.watchEntry.findFirst({
    where: { userId, mediaItemId, watchedAt },
  });
  if (exact) return exact;

  const gte = utcDayStart(watchedAt);
  const lt = utcDayEndExclusive(watchedAt);
  const dayEntries = await db.watchEntry.findMany({
    where: { userId, mediaItemId, watchedAt: { gte, lt } },
    orderBy: { watchedAt: "asc" },
  });
  return pickClosestByWatchedTime(dayEntries, watchedAt);
}

export type LetterboxdDiaryFields = {
  rating: number | null;
  activityUrl: string | null;
};

/**
 * Applies RSS diary data to an existing row (manual / Plex / unknown) without creating a duplicate.
 */
export async function mergeLetterboxdDiaryIntoWatchEntry(
  entry: Pick<WatchEntry, "id" | "rating" | "source" | "letterboxdActivityUrl">,
  diary: LetterboxdDiaryFields,
): Promise<void> {
  const data: {
    rating?: number;
    source?: WatchEntrySource;
    letterboxdActivityUrl?: string;
  } = {};
  if (diary.rating !== null && entry.rating === null) {
    data.rating = diary.rating;
    data.source = WatchEntrySource.LETTERBOXD;
  } else if (entry.source === WatchEntrySource.UNKNOWN) {
    data.source = WatchEntrySource.LETTERBOXD;
  }
  if (diary.activityUrl) {
    data.letterboxdActivityUrl = diary.activityUrl;
  }
  if (Object.keys(data).length === 0) return;
  await prisma.watchEntry.update({ where: { id: entry.id }, data });
}

/**
 * When Plex reports a play for the same title/time window as an existing entry, only upgrade
 * `UNKNOWN` to `PLEX` — do not overwrite manual or Letterboxd-sourced rows.
 */
export async function mergePlexIntoWatchEntryIfUnknown(
  entry: Pick<WatchEntry, "id" | "source">,
): Promise<void> {
  if (entry.source !== WatchEntrySource.UNKNOWN) return;
  await prisma.watchEntry.update({
    where: { id: entry.id },
    data: { source: WatchEntrySource.PLEX },
  });
}

/**
 * Tautulli provides richer session data than Plex. When a same-day match exists,
 * upgrade UNKNOWN or PLEX source to TAUTULLI. Manual and Letterboxd entries are
 * not overwritten — they represent explicit user-logged data.
 */
export async function mergeTautulliIntoWatchEntry(
  entry: Pick<WatchEntry, "id" | "source">,
): Promise<void> {
  if (
    entry.source !== WatchEntrySource.UNKNOWN &&
    entry.source !== WatchEntrySource.PLEX
  )
    return;
  await prisma.watchEntry.update({
    where: { id: entry.id },
    data: { source: WatchEntrySource.TAUTULLI },
  });
}
