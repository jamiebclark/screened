interface JellyfinUserMeResponse {
  Id: string;
  Name: string;
}

interface JellyfinItem {
  Id: string;
  Name: string;
  Type: "Movie" | "Episode" | string;
  ProviderIds?: Record<string, string>;
  SeriesName?: string;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  UserData?: { LastPlayedDate?: string; Played?: boolean };
  ProductionYear?: number;
  SeriesId?: string;
  SeriesProviderIds?: Record<string, string>;
}

interface JellyfinItemsResponse {
  Items: JellyfinItem[];
  TotalRecordCount: number;
}

function jellyfinHeaders(apiKey: string): Record<string, string> {
  return {
    "X-Emby-Token": apiKey,
    "Content-Type": "application/json",
  };
}

export async function verifyJellyfinConnection(
  serverUrl: string,
  apiKey: string,
): Promise<{
  ok: boolean;
  error?: string;
  userId?: string;
  username?: string;
}> {
  try {
    const base = serverUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/Users/Me`, {
      headers: jellyfinHeaders(apiKey),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401) {
      return { ok: false, error: "Invalid API key" };
    }
    if (!res.ok) {
      return { ok: false, error: "Could not reach Jellyfin server" };
    }
    const user = (await res.json()) as JellyfinUserMeResponse;
    return { ok: true, userId: user.Id, username: user.Name };
  } catch {
    return { ok: false, error: "Could not connect to Jellyfin" };
  }
}

export async function getJellyfinHistory(
  serverUrl: string,
  apiKey: string,
  jellyfinUserId: string,
  itemType: "Movie" | "Episode",
): Promise<JellyfinItem[]> {
  const base = serverUrl.replace(/\/$/, "");
  const all: JellyfinItem[] = [];
  const pageSize = 500;
  let startIndex = 0;
  let totalCount: number | null = null;

  while (totalCount === null || startIndex < totalCount) {
    const params = new URLSearchParams({
      IsPlayed: "true",
      Recursive: "true",
      IncludeItemTypes: itemType,
      Fields:
        "ProviderIds,UserData,SeriesName,ParentIndexNumber,IndexNumber,SeriesProviderIds",
      StartIndex: String(startIndex),
      Limit: String(pageSize),
    });

    const res = await fetch(`${base}/Users/${jellyfinUserId}/Items?${params}`, {
      headers: jellyfinHeaders(apiKey),
    });
    if (!res.ok) break;

    const body = (await res.json()) as JellyfinItemsResponse;
    if (totalCount === null) totalCount = body.TotalRecordCount ?? 0;

    const items = body.Items ?? [];
    all.push(...items);
    startIndex += items.length;
    if (items.length < pageSize) break;
  }

  return all;
}

export function extractTmdbIdFromJellyfinItem(
  item: JellyfinItem,
  useSeriesProviderIds = false,
): number | null {
  const ids = useSeriesProviderIds ? item.SeriesProviderIds : item.ProviderIds;
  if (!ids) return null;
  const raw = ids["Tmdb"] ?? ids["tmdb"];
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}
