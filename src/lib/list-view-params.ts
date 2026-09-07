export type SortField = "date_added" | "title" | "votes" | "release";
export type HiddenFilter = "include" | "exclude";

const VALID_SORTS: SortField[] = ["date_added", "title", "votes", "release"];

export function parseListViewParams(
  raw: { sort?: string; hidden?: string },
  opts: { votingEnabled: boolean },
): { sort: SortField; hiddenFilter: HiddenFilter } {
  const sort =
    raw.sort === "votes" && !opts.votingEnabled
      ? "date_added"
      : VALID_SORTS.includes(raw.sort as SortField)
        ? (raw.sort as SortField)
        : "date_added";

  const hiddenFilter: HiddenFilter =
    raw.hidden === "exclude" ? "exclude" : "include";

  return { sort, hiddenFilter };
}
