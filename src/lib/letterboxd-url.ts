/** Accept only https URLs on letterboxd.com from RSS item links. */
export function normalizeLetterboxdActivityUrl(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.hostname !== "letterboxd.com" && !url.hostname.endsWith(".letterboxd.com")) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}
