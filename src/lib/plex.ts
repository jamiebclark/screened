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
  lastViewedAt: number | null;
  guid: string;
  Guid?: { id: string }[];
}

export interface PlexWatchedEpisode {
  ratingKey: string;
  parentIndex: number;
  index: number;
  grandparentRatingKey: string;
  grandparentTitle: string;
  lastViewedAt: number | null;
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
    }
  );

  if (!res.ok) throw new Error("Failed to get Plex servers");

  const resources = await res.json() as Array<{
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
      const conn =
        r.connections.find((c) => c.local && !c.relay) ??
        r.connections.find((c) => !c.relay) ??
        r.connections[0];

      return {
        name: r.name,
        machineIdentifier: r.clientIdentifier,
        accessToken: r.accessToken,
        // Use the uri field directly — it contains the plex.direct hostname that
        // matches the SSL cert, rather than a raw IP that would fail verification
        uri: conn?.uri ?? `${conn?.protocol ?? "https"}://${conn?.address}:${conn?.port ?? 32400}`,
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

  if (!res.ok) throw new Error(`Plex server request failed: ${res.status} ${res.statusText}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    const body = await res.text();
    throw new Error(`Plex returned non-JSON response (${contentType}): ${body.slice(0, 120)}`);
  }

  return res;
}

export async function getPlexWatchHistory(
  serverUrl: string,
  token: string,
  type: "movie" | "show" = "movie"
): Promise<PlexWatchedItem[]> {
  const typeCode = type === "movie" ? 1 : 2;
  const url = `${serverUrl}/library/all?type=${typeCode}&viewCount>=1&includeGuids=1&X-Plex-Token=${token}`;
  const res = await plexServerFetch(url);
  const data = await res.json() as { MediaContainer?: { Metadata?: PlexWatchedItem[] } };
  return data?.MediaContainer?.Metadata ?? [];
}

export async function getPlexWatchedEpisodes(
  serverUrl: string,
  token: string
): Promise<PlexWatchedEpisode[]> {
  const url = `${serverUrl}/library/all?type=4&viewCount>=1&X-Plex-Token=${token}`;
  const res = await plexServerFetch(url);
  const data = await res.json() as { MediaContainer?: { Metadata?: PlexWatchedEpisode[] } };
  return data?.MediaContainer?.Metadata ?? [];
}

export async function getPlexItemMetadata(
  serverUrl: string,
  token: string,
  ratingKey: string
): Promise<PlexWatchedItem | null> {
  const url = `${serverUrl}/library/metadata/${ratingKey}?X-Plex-Token=${token}`;
  try {
    const res = await plexServerFetch(url);
    const data = await res.json() as { MediaContainer?: { Metadata?: PlexWatchedItem[] } };
    return data?.MediaContainer?.Metadata?.[0] ?? null;
  } catch {
    return null;
  }
}

export function extractTmdbIdFromGuid(guids: { id: string }[] | undefined): number | null {
  if (!guids) return null;
  const tmdbGuid = guids.find((g) => g.id.startsWith("tmdb://"));
  if (!tmdbGuid) return null;
  const id = parseInt(tmdbGuid.id.replace("tmdb://", ""), 10);
  return isNaN(id) ? null : id;
}
