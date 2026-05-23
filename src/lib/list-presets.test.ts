import { describe, it, expect } from "vitest";
import { LIST_PRESETS, applyPreset } from "./list-presets";

describe("LIST_PRESETS", () => {
  it("watchlist preset: voting off, ranking off, comments on, grid", () => {
    expect(LIST_PRESETS.watchlist).toEqual({
      rankingEnabled: false,
      votingEnabled: false,
      commentsEnabled: true,
      displayMode: "GRID",
    });
  });

  it("poll preset: voting on, ranking off, comments on, grid", () => {
    expect(LIST_PRESETS.poll).toEqual({
      rankingEnabled: false,
      votingEnabled: true,
      commentsEnabled: true,
      displayMode: "GRID",
    });
  });

  it("ranked preset: ranking on, voting off, comments on, list", () => {
    expect(LIST_PRESETS.ranked).toEqual({
      rankingEnabled: true,
      votingEnabled: false,
      commentsEnabled: true,
      displayMode: "LIST",
    });
  });

  it("custom preset: all defaults same as watchlist", () => {
    expect(LIST_PRESETS.custom).toEqual({
      rankingEnabled: false,
      votingEnabled: false,
      commentsEnabled: true,
      displayMode: "GRID",
    });
  });
});

describe("applyPreset", () => {
  it("returns preset defaults when no overrides", () => {
    expect(applyPreset("poll")).toEqual(LIST_PRESETS.poll);
  });

  it("applies overrides on top of preset", () => {
    const result = applyPreset("poll", { commentsEnabled: false });
    expect(result.votingEnabled).toBe(true);
    expect(result.commentsEnabled).toBe(false);
  });

  it("override wins over preset value", () => {
    const result = applyPreset("ranked", { displayMode: "GRID" });
    expect(result.displayMode).toBe("GRID");
    expect(result.rankingEnabled).toBe(true);
  });

  it("enforces mutex: rankingEnabled override clears votingEnabled", () => {
    const result = applyPreset("poll", { rankingEnabled: true });
    expect(result.rankingEnabled).toBe(true);
    expect(result.votingEnabled).toBe(false);
  });

  it("mutex does not fire when only one flag is true", () => {
    const result = applyPreset("watchlist", { votingEnabled: true });
    expect(result.votingEnabled).toBe(true);
    expect(result.rankingEnabled).toBe(false);
  });
});
