export type BrowseSortOrder =
  | "popularity"
  | "title"
  | "year_desc"
  | "year_asc"
  | "rating_desc"
  | "rating_asc";

const VALID_SORT_ORDERS: readonly BrowseSortOrder[] = [
  "popularity",
  "title",
  "year_desc",
  "year_asc",
  "rating_desc",
  "rating_asc",
];

export interface PersonFilterItem {
  id: number;
  name: string;
}

export interface BrowseFilter {
  genreIds: number[];
  sortOrder: BrowseSortOrder | null;
  yearMin: number | null;
  yearMax: number | null;
  includePersons: PersonFilterItem[];
  excludePersons: PersonFilterItem[];
}

function parsePersonList(raw: string | undefined): PersonFilterItem[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((pair) => {
      const colonIdx = pair.indexOf(":");
      if (colonIdx === -1) return null;
      const id = parseInt(pair.slice(0, colonIdx).trim(), 10);
      const name = decodeURIComponent(pair.slice(colonIdx + 1).trim());
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { id, name };
    })
    .filter((p): p is PersonFilterItem => p !== null)
    .slice(0, 5);
}

/** Parse URL search params into a typed BrowseFilter. */
export function parseBrowseFilter(
  params: Record<string, string | undefined>,
): BrowseFilter {
  // Genres: prefer `genres` (comma-separated IDs) over legacy `genre` (single ID)
  const genresRaw = params.genres ?? params.genre ?? "";
  const genreIds = genresRaw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  // Sort: validate against known values; null if absent or invalid
  const sortRaw = params.sort;
  const sortOrder: BrowseSortOrder | null =
    sortRaw && (VALID_SORT_ORDERS as readonly string[]).includes(sortRaw)
      ? (sortRaw as BrowseSortOrder)
      : null;

  // Year range: 4-digit integers in [1800, 2099]
  const yearMinRaw = parseInt(params.yearMin ?? "", 10);
  const yearMaxRaw = parseInt(params.yearMax ?? "", 10);
  const yearMin =
    Number.isFinite(yearMinRaw) && yearMinRaw >= 1800 && yearMinRaw <= 2099
      ? yearMinRaw
      : null;
  const yearMax =
    Number.isFinite(yearMaxRaw) && yearMaxRaw >= 1800 && yearMaxRaw <= 2099
      ? yearMaxRaw
      : null;

  return {
    genreIds,
    sortOrder,
    yearMin,
    yearMax,
    includePersons: parsePersonList(params.includePersons),
    excludePersons: parsePersonList(params.excludePersons),
  };
}

function serializePersonList(persons: PersonFilterItem[]): string {
  return persons.map((p) => `${p.id}:${encodeURIComponent(p.name)}`).join(",");
}

/**
 * Serialize a BrowseFilter into a /browse query string.
 * Preserves `type` and `filter` (scope) from the `preserve` map.
 * Intentionally omits `page` so every filter change resets to page 1.
 */
export function serializeBrowseFilter(
  filter: BrowseFilter,
  preserve: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (preserve.type && preserve.type !== "movie")
    params.set("type", preserve.type);
  if (preserve.filter) params.set("filter", preserve.filter);
  if (filter.genreIds.length > 0)
    params.set("genres", filter.genreIds.join(","));
  if (filter.sortOrder) params.set("sort", filter.sortOrder);
  if (filter.yearMin !== null) params.set("yearMin", String(filter.yearMin));
  if (filter.yearMax !== null) params.set("yearMax", String(filter.yearMax));
  if (filter.includePersons.length > 0)
    params.set("includePersons", serializePersonList(filter.includePersons));
  if (filter.excludePersons.length > 0)
    params.set("excludePersons", serializePersonList(filter.excludePersons));
  const q = params.toString();
  return q ? `/browse?${q}` : "/browse";
}

export function isFilterActive(filter: BrowseFilter): boolean {
  return (
    filter.genreIds.length > 0 ||
    filter.sortOrder !== null ||
    filter.yearMin !== null ||
    filter.yearMax !== null ||
    filter.includePersons.length > 0 ||
    filter.excludePersons.length > 0
  );
}
