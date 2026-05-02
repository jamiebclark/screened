export async function verifyOverseerrConnection(
  serverUrl: string,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const base = serverUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/api/v1/settings/main`, {
      headers: { "X-Api-Key": apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Invalid API key" };
    }
    if (!res.ok) {
      return { ok: false, error: "Could not reach Overseerr server" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not connect to Overseerr" };
  }
}

export async function submitOverseerrRequest(
  serverUrl: string,
  apiKey: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
): Promise<void> {
  const base = serverUrl.replace(/\/$/, "");
  const body =
    mediaType === "movie"
      ? { mediaType: "movie", mediaId: tmdbId }
      : { mediaType: "tv", mediaId: tmdbId, seasons: "all" };

  const res = await fetch(`${base}/api/v1/request`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 409) {
    throw new Error(`Overseerr request failed: ${res.status}`);
  }
}
