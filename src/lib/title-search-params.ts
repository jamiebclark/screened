export type TitleMediaType = "movie" | "tv" | "multi";

export type TitleSearchQuery = {
  q: string;
  mediaType: TitleMediaType;
  year: number | null;
  page: number;
  limit: number;
};

export const TITLE_SEARCH_MIN_YEAR = 1874;
export const TITLE_SEARCH_DEFAULT_LIMIT = 8;
export const TITLE_SEARCH_MAX_LIMIT = 20;

const VALID_MEDIA_TYPES: TitleMediaType[] = ["movie", "tv", "multi"];

function parseIntInRange(
  raw: string | null,
  min: number,
  max: number,
  errorLabel: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw.trim() === "") return { ok: true, value: null };
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return {
      ok: false,
      error: `${errorLabel} must be a whole number between ${min} and ${max}`,
    };
  }
  return { ok: true, value: parsed };
}

/** Route side: URLSearchParams -> validated query, or a 400-able error message. */
export function parseTitleSearchParams(
  params: URLSearchParams,
  now: Date = new Date(),
): { ok: true; value: TitleSearchQuery } | { ok: false; error: string } {
  const q = (params.get("q") ?? "").trim();

  const rawType = params.get("type");
  const mediaType = rawType === null ? "movie" : (rawType as TitleMediaType);
  if (!VALID_MEDIA_TYPES.includes(mediaType)) {
    return { ok: false, error: "Search type must be movie, tv or multi" };
  }

  const maxYear = now.getFullYear() + 10;
  const yearResult = parseIntInRange(
    params.get("year"),
    TITLE_SEARCH_MIN_YEAR,
    maxYear,
    "Year",
  );
  if (!yearResult.ok) return yearResult;

  const pageResult = parseIntInRange(params.get("page"), 1, 500, "Page");
  if (!pageResult.ok) return pageResult;

  const limitResult = parseIntInRange(
    params.get("limit"),
    1,
    TITLE_SEARCH_MAX_LIMIT,
    "Limit",
  );
  if (!limitResult.ok) return limitResult;

  return {
    ok: true,
    value: {
      q,
      mediaType,
      year: yearResult.value,
      page: pageResult.value ?? 1,
      limit: limitResult.value ?? TITLE_SEARCH_DEFAULT_LIMIT,
    },
  };
}

/** Client side: state -> query string for /api/search. Inverse of the above. */
export function buildTitleSearchQuery(
  input: Partial<TitleSearchQuery> & { q: string },
): string {
  const params = new URLSearchParams();
  params.set("q", input.q);
  if (input.mediaType !== undefined) params.set("type", input.mediaType);
  if (input.year !== undefined && input.year !== null) {
    params.set("year", String(input.year));
  }
  if (input.page !== undefined) params.set("page", String(input.page));
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  return params.toString();
}
