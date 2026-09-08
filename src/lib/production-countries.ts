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

export const BACKFILL_DEFAULT_LIMIT = 50;
export const BACKFILL_MAX_LIMIT = 200;

/** Hard ceiling on batches per click, so one run can never loop unbounded. */
export const BACKFILL_MAX_BATCHES = 100;

/** The fields of a backfill batch response the paging decision depends on. */
export type BackfillBatchResult = {
  processed: number;
  updated: number;
  remaining: number;
};

/**
 * Whether a caller paging through the backfill should request another batch.
 *
 * Stops on `updated === 0` as well as on `remaining === 0`: the route leaves
 * rows TMDB has no country data for empty on purpose, so those rows stay at the
 * head of the queue and an unconditional "run until remaining is 0" loop would
 * re-fetch the same batch forever.
 */
export function shouldContinueBackfill(
  result: BackfillBatchResult,
  batchesRun: number,
): boolean {
  if (batchesRun >= BACKFILL_MAX_BATCHES) return false;
  if (result.remaining <= 0) return false;
  if (result.processed === 0) return false;
  if (result.updated === 0) return false;
  return true;
}

/**
 * Clamps a caller-supplied backfill batch size. Backfilling costs one TMDB
 * call per item, so an unbounded batch would sit on the rate limit and risk
 * the request timing out mid-run; callers page through instead.
 */
export function parseBackfillLimit(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && raw.trim() !== ""
        ? Number(raw)
        : NaN;
  if (!Number.isFinite(n)) return BACKFILL_DEFAULT_LIMIT;
  const floored = Math.floor(n);
  if (floored < 1) return 1;
  if (floored > BACKFILL_MAX_LIMIT) return BACKFILL_MAX_LIMIT;
  return floored;
}
