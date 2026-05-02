const TRAKT_BASE = "https://api.trakt.tv";

function traktHeaders(accessToken?: string): Record<string, string> {
  const clientId = process.env.TRAKT_CLIENT_ID ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": clientId,
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  return headers;
}

export interface TraktDeviceCode {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
}

export interface TraktTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface TraktMovieHistoryRecord {
  watched_at: string;
  movie: {
    title: string;
    year: number;
    ids: { tmdb?: number; trakt?: number; imdb?: string };
  };
}

export interface TraktEpisodeHistoryRecord {
  watched_at: string;
  show: {
    title: string;
    ids: { tmdb?: number; trakt?: number; imdb?: string };
  };
  episode: {
    season: number;
    number: number;
    title: string;
  };
}

export function isTraktConfigured(): boolean {
  return !!process.env.TRAKT_CLIENT_ID && !!process.env.TRAKT_CLIENT_SECRET;
}

export async function requestTraktDeviceCode(): Promise<TraktDeviceCode> {
  const res = await fetch(`${TRAKT_BASE}/oauth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.TRAKT_CLIENT_ID }),
  });
  if (!res.ok) throw new Error("Failed to request device code");
  return res.json() as Promise<TraktDeviceCode>;
}

export type TraktPollResult =
  | { status: "authorized"; token: TraktTokenResponse }
  | { status: "pending" }
  | { status: "expired" }
  | { status: "error"; message: string };

export async function pollTraktDeviceToken(
  deviceCode: string,
): Promise<TraktPollResult> {
  try {
    const res = await fetch(`${TRAKT_BASE}/oauth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: deviceCode,
        client_id: process.env.TRAKT_CLIENT_ID,
        client_secret: process.env.TRAKT_CLIENT_SECRET,
      }),
    });

    if (res.status === 200) {
      const token = (await res.json()) as TraktTokenResponse;
      return { status: "authorized", token };
    }
    if (res.status === 400) return { status: "pending" };
    if (res.status === 410 || res.status === 409) return { status: "expired" };
    return { status: "error", message: `Unexpected status ${res.status}` };
  } catch {
    return { status: "error", message: "Network error" };
  }
}

export async function refreshTraktToken(
  refreshToken: string,
): Promise<TraktTokenResponse | null> {
  try {
    const res = await fetch(`${TRAKT_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: process.env.TRAKT_CLIENT_ID,
        client_secret: process.env.TRAKT_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<TraktTokenResponse>;
  } catch {
    return null;
  }
}

export async function getTraktUsername(
  accessToken: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${TRAKT_BASE}/users/me`, {
      headers: traktHeaders(accessToken),
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { username: string };
    return user.username;
  } catch {
    return null;
  }
}

export async function getTraktMovieHistory(
  accessToken: string,
): Promise<TraktMovieHistoryRecord[]> {
  const all: TraktMovieHistoryRecord[] = [];
  let page = 1;
  let pageCount: number | null = null;

  while (pageCount === null || page <= pageCount) {
    const res = await fetch(
      `${TRAKT_BASE}/sync/history/movies?extended=full&limit=100&page=${page}`,
      { headers: traktHeaders(accessToken) },
    );
    if (!res.ok) break;

    const data = (await res.json()) as TraktMovieHistoryRecord[];
    all.push(...data);

    if (pageCount === null) {
      const pc = res.headers.get("X-Pagination-Page-Count");
      pageCount = pc ? parseInt(pc, 10) : 1;
    }
    if (data.length === 0) break;
    page++;
  }

  return all;
}

export async function getTraktEpisodeHistory(
  accessToken: string,
): Promise<TraktEpisodeHistoryRecord[]> {
  const all: TraktEpisodeHistoryRecord[] = [];
  let page = 1;
  let pageCount: number | null = null;

  while (pageCount === null || page <= pageCount) {
    const res = await fetch(
      `${TRAKT_BASE}/sync/history/episodes?extended=full&limit=100&page=${page}`,
      { headers: traktHeaders(accessToken) },
    );
    if (!res.ok) break;

    const data = (await res.json()) as TraktEpisodeHistoryRecord[];
    all.push(...data);

    if (pageCount === null) {
      const pc = res.headers.get("X-Pagination-Page-Count");
      pageCount = pc ? parseInt(pc, 10) : 1;
    }
    if (data.length === 0) break;
    page++;
  }

  return all;
}
