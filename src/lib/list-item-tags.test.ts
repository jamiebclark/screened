import { describe, expect, it } from "vitest";
import {
  TAG_MAX_LENGTH,
  TAG_MAX_PER_ITEM,
  activeTagFragment,
  buildTagVocabulary,
  completedTagFragments,
  normalizeTagLabel,
  splitTagInput,
  suggestTags,
  tagComparisonKey,
  validateTagBatch,
  validateTagName,
  type TagVocabularyEntry,
} from "./list-item-tags";

function d(iso: string) {
  return new Date(iso);
}

describe("normalizeTagLabel", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeTagLabel("  Halloween   Movie  ")).toBe("Halloween Movie");
  });

  it("strips invisible characters that a paste can carry along", () => {
    expect(normalizeTagLabel("Tobe Hooper​")).toBe("Tobe Hooper");
    expect(normalizeTagLabel("Tobe­Hooper")).toBe("TobeHooper");
    expect(normalizeTagLabel("Tobe ​Hooper")).toBe("Tobe Hooper");
  });

  it("leaves case and typography alone", () => {
    expect(normalizeTagLabel("J-Horror")).toBe("J-Horror");
  });
});

describe("tagComparisonKey", () => {
  it("normalizes and lowercases", () => {
    expect(tagComparisonKey(" Halloween ")).toBe("halloween");
    expect(tagComparisonKey("HALLOWEEN")).toBe("halloween");
  });

  // A label pasted off a web page can carry a zero-width space or a
  // non-breaking space. It renders identically to the plain spelling, so if it
  // compared as a different string the list would show the same tag twice.
  it.each([
    ["plain", "Tobe Hooper"],
    ["non-breaking space", "Tobe Hooper"],
    ["trailing zero-width space", "Tobe Hooper​"],
    ["zero-width space after the space", "Tobe ​Hooper"],
    ["trailing soft hyphen", "Tobe Hooper­"],
    ["word joiner at the end", "Tobe Hooper⁠"],
    ["double space", "Tobe  Hooper"],
    ["upper case", "TOBE HOOPER"],
    ["full-width letter", "Ｔobe Hooper"],
    ["surrounding whitespace", "  Tobe   Hooper  "],
  ])("collides for %s", (_label, input) => {
    expect(tagComparisonKey(input)).toBe("tobe hooper");
  });

  it("keeps homoglyphs from different scripts distinct", () => {
    // Cyrillic "о" in place of the Latin one. Folding confusables across
    // scripts would merge tags that are genuinely different words.
    expect(tagComparisonKey("Tоbe Hooper")).not.toBe("tobe hooper");
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
  const listTags = [
    {
      id: "t-horror",
      label: "Horror",
      normalized: "horror",
      createdAt: d("2024-01-01T00:00:00Z"),
    },
    {
      id: "t-comedy",
      label: "Comedy",
      normalized: "comedy",
      createdAt: d("2024-01-01T00:00:00Z"),
    },
  ];

  it("counts items carrying each tag, ordering by count desc then normalized asc", () => {
    const vocabulary = buildTagVocabulary(listTags, [
      { tags: [{ listTagId: "t-horror" }] },
      { tags: [{ listTagId: "t-horror" }, { listTagId: "t-comedy" }] },
    ]);

    expect(vocabulary).toEqual([
      { id: "t-horror", label: "Horror", normalized: "horror", count: 2 },
      { id: "t-comedy", label: "Comedy", normalized: "comedy", count: 1 },
    ]);
  });

  it("seeds declared-but-unused tags at count: 0", () => {
    const vocabulary = buildTagVocabulary(listTags, []);
    expect(vocabulary).toEqual([
      { id: "t-comedy", label: "Comedy", normalized: "comedy", count: 0 },
      { id: "t-horror", label: "Horror", normalized: "horror", count: 0 },
    ]);
  });

  it("counts an item carrying the same tag twice only once", () => {
    const vocabulary = buildTagVocabulary(listTags, [
      { tags: [{ listTagId: "t-horror" }, { listTagId: "t-horror" }] },
    ]);
    expect(vocabulary.find((e) => e.id === "t-horror")?.count).toBe(1);
  });

  it("returns an empty array for a list with no declared tags", () => {
    expect(buildTagVocabulary([], [{ tags: [] }])).toEqual([]);
  });
});

describe("suggestTags", () => {
  const vocabulary: TagVocabularyEntry[] = [
    { id: "t1", label: "Horror", normalized: "horror", count: 3 },
    { id: "t2", label: "Comedy Horror", normalized: "comedy horror", count: 2 },
    { id: "t3", label: "Romance", normalized: "romance", count: 1 },
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

describe("validateTagName", () => {
  it("rejects a non-string value", () => {
    expect(validateTagName(5)).toEqual({
      ok: false,
      error: "Tag must be text",
    });
  });

  it("rejects an empty or whitespace-only label", () => {
    expect(validateTagName("  ")).toEqual({
      ok: false,
      error: "Tag cannot be empty",
    });
  });

  it("rejects a label longer than the max length", () => {
    const tooLong = "a".repeat(TAG_MAX_LENGTH + 1);
    expect(validateTagName(tooLong)).toEqual({
      ok: false,
      error: `Tags must be ${TAG_MAX_LENGTH} characters or fewer`,
    });
  });

  it("accepts a valid label, returning the normalized and display forms", () => {
    expect(validateTagName("  Halloween  ")).toEqual({
      ok: true,
      value: { label: "Halloween", normalized: "halloween" },
    });
  });
});

describe("validateTagBatch", () => {
  const vocabulary: TagVocabularyEntry[] = [
    {
      id: "t-halloween",
      label: "Halloween",
      normalized: "halloween",
      count: 2,
    },
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
      error: `Tags must be ${TAG_MAX_LENGTH} characters or fewer`,
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
    expect(result).toEqual({
      ok: true,
      value: { linkTagIds: [], createTags: [] },
    });
  });

  it("links to the existing list tag when the normalized form is already declared", () => {
    const result = validateTagBatch(["HALLOWEEN"], [], vocabulary);
    expect(result).toEqual({
      ok: true,
      value: { linkTagIds: ["t-halloween"], createTags: [] },
    });
  });

  it("accepts a genuinely new tag using the submitted casing", () => {
    const result = validateTagBatch(["Comedy"], [], []);
    expect(result).toEqual({
      ok: true,
      value: {
        linkTagIds: [],
        createTags: [{ label: "Comedy", normalized: "comedy" }],
      },
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
      value: {
        linkTagIds: [],
        createTags: [{ label: "New Tag", normalized: "new tag" }],
      },
    });
  });

  it("counts existing + linkTagIds + createTags against the per-item cap", () => {
    const existing = Array.from({ length: TAG_MAX_PER_ITEM - 2 }, (_, i) => ({
      label: `tag${i}`,
      normalized: `tag${i}`,
    }));
    // One links to an existing list tag, one is genuinely new — both count.
    const result = validateTagBatch(
      ["Halloween", "Brand New"],
      existing,
      vocabulary,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        linkTagIds: ["t-halloween"],
        createTags: [{ label: "Brand New", normalized: "brand new" }],
      },
    });
  });
});

describe("activeTagFragment", () => {
  it("returns the whole field when no comma has been typed", () => {
    expect(activeTagFragment("hor")).toBe("hor");
  });

  it("returns only the fragment after the last comma", () => {
    expect(activeTagFragment("horror, sci")).toBe("sci");
    expect(activeTagFragment("horror, cult, sci-f")).toBe("sci-f");
  });

  it("is empty immediately after a comma, so nothing is suggested yet", () => {
    expect(activeTagFragment("horror,")).toBe("");
    expect(activeTagFragment("horror, ")).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(activeTagFragment("horror,   sci  ")).toBe("sci");
  });
});

describe("completedTagFragments", () => {
  it("is empty when nothing has been comma-terminated", () => {
    expect(completedTagFragments("horror")).toEqual([]);
  });

  it("returns the fragments before the active one", () => {
    expect(completedTagFragments("horror, sci")).toEqual(["horror"]);
    expect(completedTagFragments("horror, cult, sci")).toEqual([
      "horror",
      "cult",
    ]);
  });

  it("drops empty fragments from repeated or trailing commas", () => {
    expect(completedTagFragments("horror,, cult, ")).toEqual([
      "horror",
      "cult",
    ]);
  });
});
