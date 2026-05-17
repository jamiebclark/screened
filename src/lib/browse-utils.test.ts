import { describe, it, expect } from "vitest";
import { findGenreByName } from "./browse-utils";

const GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 18, name: "Drama" },
  { id: 27, name: "Horror" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
];

describe("findGenreByName", () => {
  it("returns the genre ID for an exact name match", () => {
    expect(findGenreByName(GENRES, "Action")).toBe(28);
    expect(findGenreByName(GENRES, "Drama")).toBe(18);
  });

  it("matches case-insensitively", () => {
    expect(findGenreByName(GENRES, "action")).toBe(28);
    expect(findGenreByName(GENRES, "HORROR")).toBe(27);
    expect(findGenreByName(GENRES, "Science fiction")).toBe(878);
  });

  it("returns null when name is not found", () => {
    expect(findGenreByName(GENRES, "Thriller")).toBeNull();
    expect(findGenreByName(GENRES, "")).toBeNull();
  });

  it("returns null for an empty genre list", () => {
    expect(findGenreByName([], "Action")).toBeNull();
  });

  it("handles multi-word genre names", () => {
    expect(findGenreByName(GENRES, "Science Fiction")).toBe(878);
    expect(findGenreByName(GENRES, "science fiction")).toBe(878);
  });
});
