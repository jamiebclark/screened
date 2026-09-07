export const TAG_MAX_LENGTH = 30;
export const TAG_MAX_PER_ITEM = 15;

/** Display form: trim, then collapse internal whitespace runs to a single space. */
export function normalizeTagLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Comparison form: display form, lowercased for locale-aware matching. */
export function tagComparisonKey(raw: string): string {
  return normalizeTagLabel(raw).toLocaleLowerCase();
}

/** Splits raw comma-separated input into non-empty fragments. */
export function splitTagInput(raw: string): string[] {
  return raw
    .split(",")
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);
}

export type TagVocabularyEntry = {
  label: string;
  normalized: string;
  count: number;
};

export function buildTagVocabulary(
  items: { tags: { label: string; normalized: string; createdAt: Date }[] }[],
): TagVocabularyEntry[] {
  const byNormalized = new Map<
    string,
    { label: string; createdAt: Date; count: number }
  >();

  for (const item of items) {
    for (const tag of item.tags) {
      const existing = byNormalized.get(tag.normalized);
      if (!existing) {
        byNormalized.set(tag.normalized, {
          label: tag.label,
          createdAt: tag.createdAt,
          count: 1,
        });
        continue;
      }
      existing.count += 1;
      if (tag.createdAt.getTime() < existing.createdAt.getTime()) {
        existing.label = tag.label;
        existing.createdAt = tag.createdAt;
      }
    }
  }

  return Array.from(byNormalized.entries())
    .map(([normalized, entry]) => ({
      label: entry.label,
      normalized,
      count: entry.count,
    }))
    .sort((a, b) => {
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

export type TagBatchResult =
  | { ok: true; value: { label: string; normalized: string }[] }
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

  const toInsert: { label: string; normalized: string }[] = [];
  const seenInBatch = new Set<string>();

  for (const raw of labels as string[]) {
    const label = normalizeTagLabel(raw);
    const normalized = tagComparisonKey(raw);

    if (normalized.length === 0) {
      return { ok: false, error: "Tag cannot be empty" };
    }
    if (label.length > TAG_MAX_LENGTH) {
      return {
        ok: false,
        error: "Tags must be 30 characters or fewer",
      };
    }
    if (existingNormalized.has(normalized) || seenInBatch.has(normalized)) {
      continue;
    }

    seenInBatch.add(normalized);
    const canonical = vocabByNormalized.get(normalized);
    toInsert.push({
      label: canonical ? canonical.label : label,
      normalized,
    });
  }

  if (existingNormalized.size + toInsert.length > TAG_MAX_PER_ITEM) {
    return { ok: false, error: "An item can have at most 15 tags" };
  }

  return { ok: true, value: toInsert };
}
