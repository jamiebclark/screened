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
  const res = await fetch(`${PLEX_TV_BASE}/pms/resources?includeHttps=1&includeRelay=1`, {
    headers: {
      "X-Plex-Token": token,
      "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to get Plex servers");

  const data = await res.json() as { MediaContainer: { Device: PlexServer[] } };
  return data?.MediaContainer?.Device ?? [];
}

export async function getPlexWatchHistory(
  serverUrl: string,
  token: string,
  type: "movie" | "show" = "movie"
): Promise<PlexWatchedItem[]> {
  const typeCode = type === "movie" ? 1 : 2;
  const url = `${serverUrl}/library/all?type=${typeCode}&viewCount>=1&X-Plex-Token=${token}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Plex-Client-Identifier": PLEX_CLIENT_IDENTIFIER,
    },
  });

  if (!res.ok) throw new Error("Failed to get Plex watch history");

  const data = await res.json() as { MediaContainer?: { Metadata?: PlexWatchedItem[] } };
  return data?.MediaContainer?.Metadata ?? [];
}

export function extractTmdbIdFromGuid(guids: { id: string }[] | undefined): number | null {
  if (!guids) return null;
  const tmdbGuid = guids.find((g) => g.id.startsWith("tmdb://"));
  if (!tmdbGuid) return null;
  const id = parseInt(tmdbGuid.id.replace("tmdb://", ""), 10);
  return isNaN(id) ? null : id;
}
