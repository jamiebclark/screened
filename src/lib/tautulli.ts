interface TautulliResponse<T> {
  response: {
    result: string;
    message?: string;
    data: T;
  };
}

export interface TautulliHistoryRecord {
  id: number;
  user: string;
  title: string;
  year: number | null;
  media_type: "movie" | "episode" | "track";
  // Depending on Tautulli version: string[] or {id: string}[]
  guids: Array<string | { id: string }>;
  grandparent_title?: string;
  parent_media_index?: number;
  media_index?: number;
  grandparent_guids?: Array<string | { id: string }>;
  date: number; // Unix timestamp (session stop time)
  play_duration: number; // seconds
  percent_complete: number; // 0–100
  watched_status: 0 | 1;
}

interface TautulliHistoryData {
  data: TautulliHistoryRecord[];
  recordsFiltered: number;
  recordsTotal: number;
}

function parseGuidString(guid: string | { id: string }): string {
  return typeof guid === "string" ? guid : guid.id;
}

export function extractTmdbIdFromTautulliGuids(
  guids: Array<string | { id: string }>,
): number | null {
  for (const guid of guids) {
    const match = parseGuidString(guid).match(/^tmdb:\/\/(\d+)$/);
    if (match) return parseInt(match[1]!, 10);
  }
  return null;
}

export async function verifyTautulliConnection(
  url: string,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = url.replace(/\/$/, "");
    const res = await fetch(
      `${base}/api/v2?apikey=${encodeURIComponent(apiKey)}&cmd=get_server_info`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return { ok: false, error: "Could not reach Tautulli server" };
    const body = (await res.json()) as TautulliResponse<unknown>;
    if (body.response?.result !== "success") {
      return { ok: false, error: body.response?.message ?? "Invalid API key" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not connect to Tautulli" };
  }
}

export async function getTautulliHistory(
  url: string,
  apiKey: string,
  mediaType: "movie" | "episode",
  username?: string | null,
): Promise<TautulliHistoryRecord[]> {
  const base = url.replace(/\/$/, "");
  const all: TautulliHistoryRecord[] = [];
  const pageSize = 1000;
  const maxRecords = 10_000;

  for (let start = 0; start < maxRecords; start += pageSize) {
    const params = new URLSearchParams({
      apikey: apiKey,
      cmd: "get_history",
      media_type: mediaType,
      length: String(pageSize),
      start: String(start),
      order_column: "date",
      order_dir: "desc",
    });
    if (username) params.set("user", username);

    const res = await fetch(`${base}/api/v2?${params}`);
    if (!res.ok) break;

    const body = (await res.json()) as TautulliResponse<TautulliHistoryData>;
    if (body.response?.result !== "success") break;

    const records = body.response.data.data ?? [];
    all.push(...records.filter((r) => r.watched_status === 1));

    if (all.length >= body.response.data.recordsFiltered) break;
    if (records.length < pageSize) break;
  }

  return all;
}
