/**
 * Long enough for a challenge category read off someone else's list — e.g.
 * "Lowest rated from 1980s you have not seen" — rather than just a genre word.
 */
export const TAG_MAX_LENGTH = 60;
export const TAG_MAX_PER_ITEM = 15;

/**
 * Zero-width and format characters that render as nothing. Pasting a category
 * name off a web page can carry one of these along, and two labels that differ
 * only by an invisible character look identical on screen while comparing as
 * different strings — which is how a list ends up showing the same tag twice.
 *
 * Kept in sync with the SQL in
 * prisma/migrations/*_normalize_list_tag_keys/migration.sql. If this set
 * changes, existing ListTag.normalized values need recomputing to match.
 */
const INVISIBLE_CHARS = /[­​-‏⁠-⁤﻿]/g;

/**
 * Display form: drop invisible characters, collapse whitespace runs to a single
 * space, trim. Not case-folded and not NFKC-folded, so the label reads back the
 * way it was typed.
 */
export function normalizeTagLabel(raw: string): string {
  return raw.replace(INVISIBLE_CHARS, "").replace(/\s+/g, " ").trim();
}

/**
 * Comparison form. NFKC first, so compatibility variants (full-width letters, a
 * non-breaking space) fold onto their plain equivalents, then the display
 * cleanup, then lowercased.
 *
 * Deliberately does NOT fold confusable homoglyphs — a Cyrillic "о" stays a
 * different tag from a Latin "o", because collapsing look-alikes across scripts
 * would silently merge tags that are genuinely different words.
 */
export function tagComparisonKey(raw: string): string {
  return normalizeTagLabel(raw.normalize("NFKC")).toLocaleLowerCase();
}

/** Splits raw comma-separated input into non-empty fragments. */
export function splitTagInput(raw: string): string[] {
  return raw
    .split(",")
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);
}

/**
 * The fragment the caret is in: everything after the last comma. Suggestions
 * must match against this rather than the whole field, or typing a second tag
 * after a comma matches "horror, sci" as one string and finds nothing.
 */
export function activeTagFragment(raw: string): string {
  const lastComma = raw.lastIndexOf(",");
  return (lastComma === -1 ? raw : raw.slice(lastComma + 1)).trim();
}

/** The complete fragments before the active one. */
export function completedTagFragments(raw: string): string[] {
  const lastComma = raw.lastIndexOf(",");
  return lastComma === -1 ? [] : splitTagInput(raw.slice(0, lastComma));
}

export type TagVocabularyEntry = {
  id: string;
  label: string;
  normalized: string;
  count: number;
};

export function buildTagVocabulary(
  listTags: {
    id: string;
    label: string;
    normalized: string;
    createdAt: Date;
  }[],
  items: { tags: { listTagId: string }[] }[],
): TagVocabularyEntry[] {
  const byId = new Map<string, TagVocabularyEntry>(
    listTags.map((tag) => [
      tag.id,
      { id: tag.id, label: tag.label, normalized: tag.normalized, count: 0 },
    ]),
  );

  for (const item of items) {
    // Count each tag once per item, even if an item somehow carries it twice.
    const seenOnItem = new Set<string>();
    for (const tag of item.tags) {
      if (seenOnItem.has(tag.listTagId)) continue;
      seenOnItem.add(tag.listTagId);
      const entry = byId.get(tag.listTagId);
      if (entry) entry.count += 1;
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.normalized.localeCompare(b.normalized);
  });
}

export function suggestTags(
  vocabulary: TagVocabularyEntry[],
  query: string,
  opts?: { limit?: number; exclude?: readonly string[] },
): TagVocabularyEntry[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) return [];

  const limit = opts?.limit ?? 6;
  const exclude = new Set(opts?.exclude ?? []);
  const queryKey = trimmedQuery.toLocaleLowerCase();

  const candidates = vocabulary.filter(
    (entry) => !exclude.has(entry.normalized),
  );
  const prefixMatches = candidates.filter((entry) =>
    entry.normalized.startsWith(queryKey),
  );
  const substringMatches = candidates.filter(
    (entry) =>
      !entry.normalized.startsWith(queryKey) &&
      entry.normalized.includes(queryKey),
  );

  const seen = new Set<string>();
  const results: TagVocabularyEntry[] = [];
  for (const entry of [...prefixMatches, ...substringMatches]) {
    if (seen.has(entry.normalized)) continue;
    seen.add(entry.normalized);
    results.push(entry);
    if (results.length >= limit) break;
  }

  return results;
}

export type TagNameResult =
  | { ok: true; value: { label: string; normalized: string } }
  | { ok: false; error: string };

/** Shared emptiness/length rules for a single tag label. */
export function validateTagName(raw: unknown): TagNameResult {
  if (typeof raw !== "string") {
    return { ok: false, error: "Tag must be text" };
  }

  const label = normalizeTagLabel(raw);
  const normalized = tagComparisonKey(raw);

  if (normalized.length === 0) {
    return { ok: false, error: "Tag cannot be empty" };
  }
  if (label.length > TAG_MAX_LENGTH) {
    return {
      ok: false,
      error: `Tags must be ${TAG_MAX_LENGTH} characters or fewer`,
    };
  }

  return { ok: true, value: { label, normalized } };
}

export type TagBatchResult =
  | {
      ok: true;
      value: {
        linkTagIds: string[];
        createTags: { label: string; normalized: string }[];
      };
    }
  | { ok: false; error: string };

export function validateTagBatch(
  labels: unknown,
  existing: { label: string; normalized: string }[],
  vocabulary: TagVocabularyEntry[],
): TagBatchResult {
  if (!Array.isArray(labels) || labels.some((l) => typeof l !== "string")) {
    return { ok: false, error: "Tags must be text" };
  }

  const vocabByNormalized = new Map(
    vocabulary.map((entry) => [entry.normalized, entry]),
  );
  const existingNormalized = new Set(existing.map((tag) => tag.normalized));

  const linkTagIds: string[] = [];
  const createTags: { label: string; normalized: string }[] = [];
  const seenInBatch = new Set<string>();
  let addedCount = 0;

  for (const raw of labels as string[]) {
    const nameResult = validateTagName(raw);
    if (!nameResult.ok) return nameResult;
    const { label, normalized } = nameResult.value;

    if (existingNormalized.has(normalized) || seenInBatch.has(normalized)) {
      continue;
    }
    seenInBatch.add(normalized);
    addedCount += 1;

    const canonical = vocabByNormalized.get(normalized);
    if (canonical) {
      linkTagIds.push(canonical.id);
    } else {
      createTags.push({ label, normalized });
    }
  }

  if (existingNormalized.size + addedCount > TAG_MAX_PER_ITEM) {
    return { ok: false, error: "An item can have at most 15 tags" };
  }

  return { ok: true, value: { linkTagIds, createTags } };
}
