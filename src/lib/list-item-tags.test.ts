import { describe, expect, it } from "vitest";
import {
  TAG_MAX_LENGTH,
  TAG_MAX_PER_ITEM,
  buildTagVocabulary,
  normalizeTagLabel,
  splitTagInput,
  suggestTags,
  tagComparisonKey,
  validateTagBatch,
  type TagVocabularyEntry,
} from "./list-item-tags";

function d(iso: string) {
  return new Date(iso);
}

describe("normalizeTagLabel", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeTagLabel("  Halloween   Movie  ")).toBe("Halloween Movie");
  });
});

describe("tagComparisonKey", () => {
  it("normalizes and lowercases", () => {
    expect(tagComparisonKey(" Halloween ")).toBe("halloween");
    expect(tagComparisonKey("HALLOWEEN")).toBe("halloween");
  });
});

describe("splitTagInput", () => {
  it("splits on commas and drops empty fragments", () => {
    expect(splitTagInput("horror, ,  halloween ,,")).toEqual([
      "horror",
      "halloween",
    ]);
  });

  it("returns a single-element array for input with no commas", () => {
    expect(splitTagInput("horror")).toEqual(["horror"]);
  });
});

describe("buildTagVocabulary", () => {
  it("groups by normalized, counts items, and orders by count desc then normalized asc", () => {
    const vocabulary = buildTagVocabulary([
      {
        tags: [
          {
            label: "Horror",
            normalized: "horror",
            createdAt: d("2024-01-02T00:00:00Z"),
          },
        ],
      },
      {
        tags: [
          {
            label: "horror",
            normalized: "horror",
            createdAt: d("2024-01-01T00:00:00Z"),
          },
          {
            label: "Comedy",
            normalized: "comedy",
            createdAt: d("2024-01-01T00:00:00Z"),
          },
        ],
      },
    ]);

    expect(vocabulary).toEqual([
      { label: "horror", normalized: "horror", count: 2 },
      { label: "Comedy", normalized: "comedy", count: 1 },
    ]);
  });

  it("picks the earliest-createdAt label as the canonical casing", () => {
    const vocabulary = buildTagVocabulary([
      {
        tags: [
          {
            label: "HALLOWEEN",
            normalized: "halloween",
            createdAt: d("2024-02-01T00:00:00Z"),
          },
        ],
      },
      {
        tags: [
          {
            label: "Halloween",
            normalized: "halloween",
            createdAt: d("2024-01-01T00:00:00Z"),
          },
        ],
      },
    ]);
    expect(vocabulary[0].label).toBe("Halloween");
  });

  it("returns an empty array for items with no tags", () => {
    expect(buildTagVocabulary([{ tags: [] }])).toEqual([]);
  });
});

describe("suggestTags", () => {
  const vocabulary: TagVocabularyEntry[] = [
    { label: "Horror", normalized: "horror", count: 3 },
    { label: "Comedy Horror", normalized: "comedy horror", count: 2 },
    { label: "Romance", normalized: "romance", count: 1 },
  ];

  it("returns prefix matches before substring matches", () => {
    const result = suggestTags(vocabulary, "hor");
    expect(result.map((e) => e.normalized)).toEqual([
      "horror",
      "comedy horror",
    ]);
  });

  it("excludes normalized forms in the exclude list", () => {
    const result = suggestTags(vocabulary, "hor", { exclude: ["horror"] });
    expect(result.map((e) => e.normalized)).toEqual(["comedy horror"]);
  });

  it("caps results at the limit", () => {
    const result = suggestTags(vocabulary, "o", { limit: 1 });
    expect(result).toHaveLength(1);
  });

  it("returns an empty array for an empty or whitespace-only query", () => {
    expect(suggestTags(vocabulary, "")).toEqual([]);
    expect(suggestTags(vocabulary, "   ")).toEqual([]);
  });
});

describe("validateTagBatch", () => {
  const vocabulary: TagVocabularyEntry[] = [
    { label: "Halloween", normalized: "halloween", count: 2 },
  ];

  it("rejects a non-array input", () => {
    expect(validateTagBatch("horror", [], [])).toEqual({
      ok: false,
      error: "Tags must be text",
    });
  });

  it("rejects an array with a non-string element", () => {
    expect(validateTagBatch(["horror", 5], [], [])).toEqual({
      ok: false,
      error: "Tags must be text",
    });
  });

  it("rejects an empty or whitespace-only label", () => {
    expect(validateTagBatch(["  "], [], [])).toEqual({
      ok: false,
      error: "Tag cannot be empty",
    });
  });

  it("rejects a label longer than the max length", () => {
    const tooLong = "a".repeat(TAG_MAX_LENGTH + 1);
    expect(validateTagBatch([tooLong], [], [])).toEqual({
      ok: false,
      error: "Tags must be 30 characters or fewer",
    });
  });

  it("rejects when the resulting set would exceed the per-item cap", () => {
    const existing = Array.from({ length: TAG_MAX_PER_ITEM }, (_, i) => ({
      label: `tag${i}`,
      normalized: `tag${i}`,
    }));
    expect(validateTagBatch(["new tag"], existing, [])).toEqual({
      ok: false,
      error: "An item can have at most 15 tags",
    });
  });

  it("silently drops a label already on the item, without error", () => {
    const existing = [{ label: "Halloween", normalized: "halloween" }];
    const result = validateTagBatch(["halloween"], existing, vocabulary);
    expect(result).toEqual({ ok: true, value: [] });
  });

  it("canonicalises casing to the list vocabulary's display label", () => {
    const result = validateTagBatch(["HALLOWEEN"], [], vocabulary);
    expect(result).toEqual({
      ok: true,
      value: [{ label: "Halloween", normalized: "halloween" }],
    });
  });

  it("accepts a genuinely new tag using the submitted casing", () => {
    const result = validateTagBatch(["Comedy"], [], []);
    expect(result).toEqual({
      ok: true,
      value: [{ label: "Comedy", normalized: "comedy" }],
    });
  });

  it("measures the cap on the resulting deduped set, not the raw input length", () => {
    const existing = Array.from({ length: TAG_MAX_PER_ITEM - 1 }, (_, i) => ({
      label: `tag${i}`,
      normalized: `tag${i}`,
    }));
    // Two submitted labels normalize to the same value, so only one is actually new.
    const result = validateTagBatch(["New Tag", "new tag"], existing, []);
    expect(result).toEqual({
      ok: true,
      value: [{ label: "New Tag", normalized: "new tag" }],
    });
  });
});
