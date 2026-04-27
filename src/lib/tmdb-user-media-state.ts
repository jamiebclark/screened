import { MediaType, WatchStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

/** Aligned with `/api/media/status` batch `tmdbIds` cap. */
export const MAX_TMDB_IDS_PER_USER_STATE_QUERY = 80;

export type TmdbUserMediaState = {
  status: WatchStatus | null;
  /** True if the title appears on any list the user is a member of. */
  onList: boolean;
};

type MovieOrTv = "movie" | "tv";

function chunkIds(ids: number[], size: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

/** Stable key for a TMDB id + app media kind (use when mixing movies and TV in one screen). */
export function tmdbRefKey(type: MovieOrTv, tmdbId: number): string {
  return `${type}:${tmdbId}`;
}

/**
 * For logged-in user: batch-load watch status and list membership for TMDB ids of one type.
 * Ids with no `MediaItem` in the app resolve to `{ status: null, onList: false }`.
 */
export async function getUserTmdbMediaStateForTmdbIds(
  userId: string,
  type: MovieOrTv,
  tmdbIds: number[],
): Promise<Map<number, TmdbUserMediaState>> {
  const unique = [
    ...new Set(tmdbIds.filter((n) => Number.isFinite(n))),
  ] as number[];
  const result = new Map<number, TmdbUserMediaState>();
  for (const id of unique) {
    result.set(id, { status: null, onList: false });
  }
  if (unique.length === 0) {
    return result;
  }

  const mediaType = type === "movie" ? MediaType.MOVIE : MediaType.TV;
  for (const part of chunkIds(unique, MAX_TMDB_IDS_PER_USER_STATE_QUERY)) {
    const items = await prisma.mediaItem.findMany({
      where: { tmdbId: { in: part }, type: mediaType },
      select: { id: true, tmdbId: true },
    });
    if (items.length === 0) {
      continue;
    }
    const mediaItemIds = items.map((i) => i.id);
    const [statuses, listRows] = await Promise.all([
      prisma.userMediaStatus.findMany({
        where: { userId, mediaItemId: { in: mediaItemIds } },
        select: { mediaItemId: true, status: true },
      }),
      prisma.listItem.findMany({
        where: {
          mediaItemId: { in: mediaItemIds },
          list: { members: { some: { userId } } },
        },
        select: { mediaItemId: true },
      }),
    ]);
    const onListMedia = new Set(listRows.map((r) => r.mediaItemId));
    const statusByMedia = new Map(
      statuses.map((s) => [s.mediaItemId, s.status] as const),
    );
    for (const item of items) {
      result.set(item.tmdbId, {
        status: statusByMedia.get(item.id) ?? null,
        onList: onListMedia.has(item.id),
      });
    }
  }

  return result;
}

/**
 * Like {@link getUserTmdbMediaStateForTmdbIds} but for mixed movie + TV rows (e.g. search / discovery).
 * Keys are {@link tmdbRefKey} strings.
 */
export async function getUserTmdbMediaStateByRef(
  userId: string,
  refs: ReadonlyArray<{ tmdbId: number; type: MovieOrTv }>,
): Promise<Map<string, TmdbUserMediaState>> {
  const byMovie: number[] = [];
  const byTv: number[] = [];
  const seen = new Set<string>();
  for (const r of refs) {
    const k = tmdbRefKey(r.type, r.tmdbId);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    if (r.type === "movie") {
      byMovie.push(r.tmdbId);
    } else {
      byTv.push(r.tmdbId);
    }
  }

  const [movieMap, tvMap] = await Promise.all([
    getUserTmdbMediaStateForTmdbIds(userId, "movie", byMovie),
    getUserTmdbMediaStateForTmdbIds(userId, "tv", byTv),
  ]);

  const out = new Map<string, TmdbUserMediaState>();
  for (const r of refs) {
    const k = tmdbRefKey(r.type, r.tmdbId);
    if (out.has(k)) {
      continue;
    }
    const st =
      r.type === "movie" ? movieMap.get(r.tmdbId) : tvMap.get(r.tmdbId);
    out.set(k, st ?? { status: null, onList: false });
  }
  return out;
}
