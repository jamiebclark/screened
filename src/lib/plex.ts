import { prisma } from "@/lib/prisma";
import { extractTmdbIdFromGuid } from "@/lib/plex-metadata-utils";

export {
  extractTmdbIdFromGuid,
  plexWebAppMovieUrl,
} from "@/lib/plex-metadata-utils";

const PLEX_TV_BASE = "https://plex.tv";
const PLEX_CLIENT_IDENTIFIER = "screened";
const PLEX_PRODUCT = "Screened";

export interface PlexPin {
  id: number;
  code: string;
  expiresAt: string;
  authToken: string | null;
}

export interface PlexUser {
  id: number;
  username: string;
  email: string;
  thumb: string;
}

export interface PlexServer {
  name: string;
  machineIdentifier: string;
  accessToken: string;
  uri: string;
  scheme: string;
  address: string;
  port: string;
}

export interface PlexWatchedItem {
  ratingKey: string;
  title: string;
  type: "movie" | "episode" | "show";
  viewCount: number;
  lastViewedAt: number | string | null;
  guid: string;
  Guid?: { id: string }[];
}

export interface PlexWatchedEpisode {
  ratingKey: string;
  /** Season number; may be string in some PMS JSON responses. */
  parentIndex?: number | string | null;
  /** Episode index within season; may be string in some PMS JSON responses. */
  index?: number | string | null;
  grandparentRatingKey: string;
  grandparentTitle: string;
  /** Unix seconds when Plex last reported a view (number or numeric string in some JSON). */
  lastViewedAt: number | string | null;
  viewCount: number;
}

export async function createPlexPin(): Promise<PlexPin> {
  const res = await fetch(`${PLEX_TV_BASE}/api/v2/pins`, {
    method: "POST",
    headers: {
      "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
      "X-Plex-Product": PLEX_PRODUCT,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ strong: true }),
  });

  if (!res.ok) throw new Error("Failed to create Plex pin");
  return res.json() as Promise<PlexPin>;
}

export async function checkPlexPin(pinId: number): Promise<PlexPin> {
  const res = await fetch(`${PLEX_TV_BASE}/api/v2/pins/${pinId}`, {
    headers: {
      "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to check Plex pin");
  return res.json() as Promise<PlexPin>;
}

export function getPlexAuthUrl(pinCode: string, forwardUrl: string): string {
  const params = new URLSearchParams({
    clientID: PLEX_CLIENT_IDENTIFIER,
    code: pinCode,
    context_device_name: PLEX_PRODUCT,
    forwardUrl,
  });
  return `https://app.plex.tv/auth#?${params.toString()}`;
}

export async function getPlexUser(token: string): Promise<PlexUser> {
  const res = await fetch(`${PLEX_TV_BASE}/api/v2/user`, {
    headers: {
      "X-Plex-Token": token,
      "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to get Plex user");
  return res.json() as Promise<PlexUser>;
}

export async function getPlexServers(token: string): Promise<PlexServer[]> {
  const res = await fetch(
    `${PLEX_TV_BASE}/api/v2/resources?includeHttps=1&includeRelay=1&includeIPv6=1`,
    {
      headers: {
        "X-Plex-Token": token,
        "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) throw new Error("Failed to get Plex servers");

  const resources = (await res.json()) as Array<{
    name: string;
    clientIdentifier: string;
    accessToken: string;
    provides: string;
    connections: Array<{
      protocol: string;
      address: string;
      port: number;
      uri: string;
      local: boolean;
      relay: boolean;
    }>;
  }>;

  return resources
    .filter((r) => r.provides?.includes("server"))
    .map((r) => {
      // Prefer a direct local connection, then any non-relay, then fall back to relay
      const connections = r.connections ?? [];
      const conn =
        connections.find((c) => c.local && !c.relay) ??
        connections.find((c) => !c.relay) ??
        connections[0];

      return {
        name: r.name,
        machineIdentifier: r.clientIdentifier,
        accessToken: r.accessToken,
        // Use the uri field directly — it contains the plex.direct hostname that
        // matches the SSL cert, rather than a raw IP that would fail verification
        uri:
          conn?.uri ??
          `${conn?.protocol ?? "https"}://${conn?.address}:${conn?.port ?? 32400}`,
        scheme: conn?.protocol ?? "https",
        address: conn?.address ?? "",
        port: String(conn?.port ?? 32400),
      };
    });
}

async function plexServerFetch(url: string): Promise<Response> {
  // Disable TLS cert validation for direct Plex server connections.
  // Plex issues certs for *.plex.direct DNS names, but local connections use raw IPs,
  // causing ERR_TLS_CERT_ALTNAME_INVALID. This is safe since we're talking to our own server.
  const origReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
      },
    });
  } finally {
    if (origReject === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = origReject;
    }
  }

  if (!res.ok)
    throw new Error(
      `Plex server request failed: ${res.status} ${res.statusText}`,
    );

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    const body = await res.text();
    throw new Error(
      `Plex returned non-JSON response (${contentType}): ${body.slice(0, 120)}`,
    );
  }

  return res;
}

export async function getPlexWatchHistory(
  serverUrl: string,
  token: string,
  type: "movie" | "show" = "movie",
): Promise<PlexWatchedItem[]> {
  const typeCode = type === "movie" ? 1 : 2;
  const url = `${serverUrl}/library/all?type=${typeCode}&viewCount>=1&includeGuids=1&X-Plex-Token=${token}`;
  const res = await plexServerFetch(url);
  const data = (await res.json()) as {
    MediaContainer?: { Metadata?: PlexWatchedItem[] };
  };
  return data?.MediaContainer?.Metadata ?? [];
}

const PLEX_PAGE_SIZE = 200;

/** How long a full Plex movie index stays hot per user/server (generation). */
const PLEX_LIBRARY_INDEX_TTL_MS = 10 * 60 * 1000;

const plexLibraryIndexCache = new Map<
  string,
  { map: Map<number, string>; expiresAt: number }
>();
const plexLibraryIndexInflight = new Map<
  string,
  Promise<Map<number, string>>
>();
const plexLibraryIndexGeneration = new Map<string, number>();

/**
 * Call when Plex is linked, unlinked, or tokens/server change so cached library indexes are abandoned.
 */
export function bumpPlexLibraryIndexCacheGeneration(userId: string): void {
  plexLibraryIndexGeneration.set(
    userId,
    (plexLibraryIndexGeneration.get(userId) ?? 0) + 1,
  );
}

function plexLibraryIndexCacheKey(
  userId: string,
  machineIdentifier: string,
): string {
  const gen = plexLibraryIndexGeneration.get(userId) ?? 0;
  return `${userId}:${machineIdentifier}:g${gen}`;
}

/**
 * All movies in the user’s library (watched or not) with a TMDB guid and Plex rating key.
 * Paginated once; last write wins if the same TMDB id appears twice.
 */
export async function getPlexLibraryMovieTmdbToRatingKey(
  serverUrl: string,
  token: string,
): Promise<Map<number, string>> {
  const byTmdb = new Map<number, string>();
  let start = 0;
  for (;;) {
    const url = `${serverUrl}/library/all?type=1&includeGuids=1&X-Plex-Token=${encodeURIComponent(
      token,
    )}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PLEX_PAGE_SIZE}`;
    const res = await plexServerFetch(url);
    const data = (await res.json()) as {
      MediaContainer?: {
        Metadata?: PlexWatchedItem[];
        totalSize?: number;
        size?: number;
      };
    };
    const met = data?.MediaContainer?.Metadata ?? [];
    const total = data?.MediaContainer?.totalSize ?? start + met.length;
    for (const item of met) {
      const id = extractTmdbIdFromGuid(item.Guid);
      if (id != null && item.ratingKey) byTmdb.set(id, item.ratingKey);
    }
    start += met.length;
    if (met.length === 0 || start >= total) break;
  }
  return byTmdb;
}

async function readPlexLibraryCacheFromDB(
  userId: string,
  machineIdentifier: string,
): Promise<{ map: Map<number, string>; cachedAt: Date } | null> {
  const conn = await prisma.plexConnection.findUnique({
    where: { userId },
    select: { libraryCache: true, libraryCachedAt: true, plexServerId: true },
  });
  if (!conn?.libraryCache || !conn.libraryCachedAt) return null;
  // Invalidate if the user has switched to a different Plex server
  if (conn.plexServerId && conn.plexServerId !== machineIdentifier) return null;
  const entries = conn.libraryCache as Array<[number, string]>;
  return { map: new Map(entries), cachedAt: conn.libraryCachedAt };
}

async function writePlexLibraryCacheToDB(
  userId: string,
  map: Map<number, string>,
): Promise<void> {
  await prisma.plexConnection.update({
    where: { userId },
    data: { libraryCache: [...map.entries()], libraryCachedAt: new Date() },
  });
}

function scheduleBackgroundLibraryRefresh(
  userId: string,
  ctx: PlexServerContext,
  cacheKey: string,
): void {
  if (plexLibraryIndexInflight.has(cacheKey)) return;
  const promise = getPlexLibraryMovieTmdbToRatingKey(ctx.serverUrl, ctx.token)
    .then(async (map) => {
      plexLibraryIndexCache.set(cacheKey, {
        map,
        expiresAt: Date.now() + PLEX_LIBRARY_INDEX_TTL_MS,
      });
      await writePlexLibraryCacheToDB(userId, map).catch((e) =>
        console.error("[plex] background library cache write failed:", e),
      );
      return map;
    })
    .catch((e) => {
      console.error("[plex] background library refresh failed:", e);
      return new Map<number, string>();
    })
    .finally(() => {
      plexLibraryIndexInflight.delete(cacheKey);
    });
  plexLibraryIndexInflight.set(cacheKey, promise);
}

async function getPlexLibraryMovieIndexCached(
  userId: string,
  ctx: PlexServerContext,
): Promise<Map<number, string>> {
  const cacheKey = plexLibraryIndexCacheKey(userId, ctx.machineIdentifier);
  const now = Date.now();

  // 1. In-memory hit — fastest path
  const hit = plexLibraryIndexCache.get(cacheKey);
  if (hit && hit.expiresAt > now) {
    return hit.map;
  }

  // 2. DB cache hit — return immediately, refresh in background if stale
  const dbCache = await readPlexLibraryCacheFromDB(
    userId,
    ctx.machineIdentifier,
  );
  if (dbCache) {
    plexLibraryIndexCache.set(cacheKey, {
      map: dbCache.map,
      expiresAt: now + PLEX_LIBRARY_INDEX_TTL_MS,
    });
    if (now - dbCache.cachedAt.getTime() > PLEX_LIBRARY_INDEX_TTL_MS) {
      scheduleBackgroundLibraryRefresh(userId, ctx, cacheKey);
    }
    return dbCache.map;
  }

  // 3. Cold start — block until we have data, then persist to DB
  let pending = plexLibraryIndexInflight.get(cacheKey);
  if (!pending) {
    pending = getPlexLibraryMovieTmdbToRatingKey(ctx.serverUrl, ctx.token)
      .then(async (map) => {
        plexLibraryIndexCache.set(cacheKey, {
          map,
          expiresAt: Date.now() + PLEX_LIBRARY_INDEX_TTL_MS,
        });
        await writePlexLibraryCacheToDB(userId, map).catch((e) =>
          console.error("[plex] library cache write failed:", e),
        );
        return map;
      })
      .finally(() => {
        plexLibraryIndexInflight.delete(cacheKey);
      });
    plexLibraryIndexInflight.set(cacheKey, pending);
  }
  return pending;
}

/**
 * All movies in the user’s library (watched or not) with a TMDB guid.
 * Paginated for large libraries.
 */
export async function getPlexLibraryMovieTmdbIds(
  serverUrl: string,
  token: string,
): Promise<number[]> {
  const map = await getPlexLibraryMovieTmdbToRatingKey(serverUrl, token);
  return [...map.keys()];
}

export async function getPlexWatchedEpisodes(
  serverUrl: string,
  token: string,
): Promise<PlexWatchedEpisode[]> {
  const all: PlexWatchedEpisode[] = [];
  let start = 0;
  const tok = encodeURIComponent(token);
  for (;;) {
    const url = `${serverUrl}/library/all?type=4&viewCount>=1&X-Plex-Token=${tok}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PLEX_PAGE_SIZE}`;
    const res = await plexServerFetch(url);
    const data = (await res.json()) as {
      MediaContainer?: {
        Metadata?: PlexWatchedEpisode[];
        totalSize?: number;
        size?: number;
      };
    };
    const items = data?.MediaContainer?.Metadata ?? [];
    const total = data?.MediaContainer?.totalSize ?? start + items.length;
    all.push(...items);
    start += items.length;
    if (start >= total || items.length === 0) break;
  }
  return all;
}

export async function getPlexItemMetadata(
  serverUrl: string,
  token: string,
  ratingKey: string,
): Promise<PlexWatchedItem | null> {
  const url = `${serverUrl}/library/metadata/${ratingKey}?X-Plex-Token=${token}`;
  try {
    const res = await plexServerFetch(url);
    const data = (await res.json()) as {
      MediaContainer?: { Metadata?: PlexWatchedItem[] };
    };
    return data?.MediaContainer?.Metadata?.[0] ?? null;
  } catch {
    return null;
  }
}

export type PlexServerContext = {
  serverUrl: string;
  token: string;
  machineIdentifier: string;
};

/** Resolved server URL, token, and machine id for API calls and deep links, or null if Plex is not linked. */
export async function getPlexServerContextForUser(
  userId: string,
): Promise<PlexServerContext | null> {
  const c = await prisma.plexConnection.findUnique({
    where: { userId },
    select: { plexToken: true, plexServerId: true },
  });
  if (!c) return null;
  const servers = await getPlexServers(c.plexToken);
  const server =
    servers.find((s) => s.machineIdentifier === c.plexServerId) ?? servers[0];
  if (!server) return null;
  return {
    serverUrl: server.uri,
    token: server.accessToken ?? c.plexToken,
    machineIdentifier: server.machineIdentifier,
  };
}

/**
 * Find a movie in the user’s Plex libraries by TMDB id (via Guid entries). Tries a direct guid filter
 * first (works on many servers); falls back to paging through all movies when the filter misses
 * (e.g. new Plex Movie agent with a non-TMDB primary guid).
 */
export async function findPlexMovieByTmdbId(
  serverUrl: string,
  token: string,
  tmdbId: number,
): Promise<{ ratingKey: string } | null> {
  const guidParam = encodeURIComponent(`tmdb://${tmdbId}`);
  const tryUrl = `${serverUrl}/library/all?type=1&includeGuids=1&guid=${guidParam}&X-Plex-Token=${encodeURIComponent(
    token,
  )}`;
  try {
    const res = await plexServerFetch(tryUrl);
    const data = (await res.json()) as {
      MediaContainer?: { Metadata?: PlexWatchedItem[] };
    };
    for (const item of data?.MediaContainer?.Metadata ?? []) {
      if (item.ratingKey && extractTmdbIdFromGuid(item.Guid) === tmdbId) {
        return { ratingKey: item.ratingKey };
      }
    }
  } catch {
    /* guid filter unsupported or error — use full scan */
  }

  let start = 0;
  for (;;) {
    const pageUrl = `${serverUrl}/library/all?type=1&includeGuids=1&X-Plex-Token=${encodeURIComponent(
      token,
    )}&X-Plex-Container-Start=${start}&X-Plex-Container-Size=${PLEX_PAGE_SIZE}`;
    const res = await plexServerFetch(pageUrl);
    const data = (await res.json()) as {
      MediaContainer?: {
        Metadata?: PlexWatchedItem[];
        totalSize?: number;
        size?: number;
      };
    };
    const items = data?.MediaContainer?.Metadata ?? [];
    const total = data?.MediaContainer?.totalSize ?? start + items.length;
    for (const item of items) {
      if (item.ratingKey && extractTmdbIdFromGuid(item.Guid) === tmdbId) {
        return { ratingKey: item.ratingKey };
      }
    }
    start += items.length;
    if (items.length === 0 || start >= total) break;
  }
  return null;
}

export async function findPlexMovieByTmdbIdForUser(
  userId: string,
  tmdbId: number,
): Promise<{ ratingKey: string; machineIdentifier: string } | null> {
  const ctx = await getPlexServerContextForUser(userId);
  if (!ctx) return null;
  const map = await getPlexLibraryMovieIndexCached(userId, ctx);
  const ratingKey = map.get(tmdbId);
  if (!ratingKey) return null;
  return { ratingKey, machineIdentifier: ctx.machineIdentifier };
}

/** All movie TMDB ids in the user’s Plex movie libraries, or null if not linked. */
export async function getPlexMovieTmdbIdSetForUser(
  userId: string,
): Promise<Set<number> | null> {
  const ctx = await getPlexServerContextForUser(userId);
  if (!ctx) return null;
  const map = await getPlexLibraryMovieIndexCached(userId, ctx);
  return new Set(map.keys());
}

export type IntersectingPlexResult =
  | { kind: "none" }
  | { kind: "ok"; ids: Set<number> };

/**
 * Intersection of every participant that has a linked Plex account.
 * Participants without Plex are ignored (we only constrain using libraries we can read).
 */
export async function getIntersectingPlexMovieTmdbIds(
  participantUserIds: string[],
): Promise<IntersectingPlexResult> {
  if (participantUserIds.length === 0) return { kind: "none" };
  const sets: Set<number>[] = [];
  for (const id of participantUserIds) {
    const s = await getPlexMovieTmdbIdSetForUser(id);
    if (s) sets.push(s);
  }
  if (sets.length === 0) return { kind: "none" };
  let acc = new Set(sets[0]!);
  for (let i = 1; i < sets.length; i++) {
    const b = sets[i]!;
    acc = new Set([...acc].filter((t) => b.has(t)));
  }
  return { kind: "ok", ids: acc };
}
