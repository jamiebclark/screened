/**
 * Production countries are stored as ISO 3166-1 alpha-2 codes. TMDB reports
 * them differently per media type — films carry `production_countries` objects,
 * TV carries a bare `origin_country` array of codes — so both are funnelled
 * through here and end up in one shape.
 */

/** A TMDB `production_countries` entry, or a bare code from `origin_country`. */
export type RawCountry = string | { iso_3166_1?: unknown } | null | undefined;

const ISO_ALPHA2 = /^[A-Za-z]{2}$/;

/**
 * Normalises TMDB's country fields to unique uppercase alpha-2 codes, in the
 * order first seen. Anything that is not a two-letter code is dropped rather
 * than stored, so display never has to defend against junk.
 */
export function extractProductionCountries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const entry of raw as RawCountry[]) {
    const candidate =
      typeof entry === "string"
        ? entry
        : entry && typeof entry === "object" && "iso_3166_1" in entry
          ? entry.iso_3166_1
          : null;
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!ISO_ALPHA2.test(trimmed)) continue;
    const code = trimmed.toUpperCase();
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

/**
 * Human-readable country name for a stored code. Uses Intl rather than a
 * hand-maintained table; falls back to the code itself when the runtime cannot
 * resolve it, so the UI always has something to show.
 */
export function countryDisplayName(code: string, locale = "en"): string {
  const upper = code.trim().toUpperCase();
  if (!ISO_ALPHA2.test(upper)) return code;
  try {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return names.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

/** Comma-joined display names, for a compact line under a title. */
export function formatProductionCountries(
  codes: readonly string[],
  locale = "en",
): string {
  return codes.map((code) => countryDisplayName(code, locale)).join(", ");
}
