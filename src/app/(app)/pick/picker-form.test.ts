import { describe, it, expect } from "vitest";
import { parseOptionalYear, applyFilterListChange } from "./picker-form";
import type { PickerRoomState } from "@/lib/picker-room-state";

// ─── parseOptionalYear ────────────────────────────────────────────────────────

describe("parseOptionalYear", () => {
  it("returns undefined for empty string", () => {
    expect(parseOptionalYear("")).toBeUndefined();
  });

  it("returns undefined for whitespace", () => {
    expect(parseOptionalYear("   ")).toBeUndefined();
  });

  it("parses a valid year", () => {
    expect(parseOptionalYear("2010")).toBe(2010);
  });

  it("parses a year with surrounding whitespace", () => {
    expect(parseOptionalYear("  1999  ")).toBe(1999);
  });

  it("returns undefined for non-numeric input", () => {
    expect(parseOptionalYear("abc")).toBeUndefined();
  });
});

// ─── applyFilterListChange ────────────────────────────────────────────────────

function baseState(overrides: Partial<PickerRoomState> = {}): PickerRoomState {
  return {
    attractors: [],
    repellers: [],
    vetoIds: [],
    participants: [],
    minYear: "",
    maxYear: "",
    maxRuntime: "",
    requirePeople: [],
    excludePeople: [],
    includeGenres: [],
    excludeGenres: [],
    plexLibraryOnly: false,
    hideAllLogged: false,
    scoringInProgress: false,
    scoringError: null,
    scoringResults: null,
    lastScoreFingerprint: null,
    filterAttribution: {},
    filterFieldEditors: {},
    shortlist: [],
    votes: {},
    ...overrides,
  };
}

describe("applyFilterListChange", () => {
  it("adds a new value and records attribution", () => {
    const state = baseState();
    const next = applyFilterListChange(
      state,
      "requirePeople",
      ["Nolan"],
      "user1",
    );
    expect(next.requirePeople).toEqual(["Nolan"]);
    expect(next.filterAttribution?.requirePeople?.["Nolan"]).toBe("user1");
  });

  it("removes a value and clears its attribution entry", () => {
    const state = baseState({
      requirePeople: ["Nolan", "Scorsese"],
      filterAttribution: {
        requirePeople: { Nolan: "user1", Scorsese: "user2" },
      },
    });
    const next = applyFilterListChange(
      state,
      "requirePeople",
      ["Nolan"],
      "user1",
    );
    expect(next.requirePeople).toEqual(["Nolan"]);
    expect(next.filterAttribution?.requirePeople).not.toHaveProperty(
      "Scorsese",
    );
    expect(next.filterAttribution?.requirePeople?.["Nolan"]).toBe("user1");
  });

  it("does not overwrite attribution for existing values", () => {
    const state = baseState({
      requirePeople: ["Nolan"],
      filterAttribution: { requirePeople: { Nolan: "user1" } },
    });
    // user2 adds Scorsese alongside Nolan — Nolan's attribution must stay user1
    const next = applyFilterListChange(
      state,
      "requirePeople",
      ["Nolan", "Scorsese"],
      "user2",
    );
    expect(next.filterAttribution?.requirePeople?.["Nolan"]).toBe("user1");
    expect(next.filterAttribution?.requirePeople?.["Scorsese"]).toBe("user2");
  });

  it("works across all four list keys", () => {
    const keys = [
      "requirePeople",
      "excludePeople",
      "includeGenres",
      "excludeGenres",
    ] as const;
    for (const key of keys) {
      const state = baseState();
      const next = applyFilterListChange(state, key, ["value"], "uid");
      expect(next[key]).toEqual(["value"]);
      expect(next.filterAttribution?.[key]?.["value"]).toBe("uid");
    }
  });

  it("preserves other filterAttribution keys when updating one list", () => {
    const state = baseState({
      excludeGenres: ["Horror"],
      filterAttribution: { excludeGenres: { Horror: "user1" } },
    });
    const next = applyFilterListChange(
      state,
      "requirePeople",
      ["Nolan"],
      "user2",
    );
    expect(next.filterAttribution?.excludeGenres?.["Horror"]).toBe("user1");
    expect(next.filterAttribution?.requirePeople?.["Nolan"]).toBe("user2");
  });

  it("clears all values and attribution when passed an empty array", () => {
    const state = baseState({
      requirePeople: ["Nolan"],
      filterAttribution: { requirePeople: { Nolan: "user1" } },
    });
    const next = applyFilterListChange(state, "requirePeople", [], "user1");
    expect(next.requirePeople).toEqual([]);
    expect(next.filterAttribution?.requirePeople).toEqual({});
  });
});
