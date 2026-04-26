import { describe, it, expect } from "vitest";
import { normalizeLetterboxdActivityUrl } from "./letterboxd-url";

describe("normalizeLetterboxdActivityUrl", () => {
  it("normalizes https letterboxd.com links", () => {
    expect(normalizeLetterboxdActivityUrl("https://letterboxd.com/alice/film/inception/")).toBe(
      "https://letterboxd.com/alice/film/inception/"
    );
  });

  it("upgrades http to https", () => {
    expect(normalizeLetterboxdActivityUrl("http://letterboxd.com/alice/film/foo/")).toBe(
      "https://letterboxd.com/alice/film/foo/"
    );
  });

  it("adds https when scheme omitted", () => {
    expect(normalizeLetterboxdActivityUrl("letterboxd.com/bob/film/bar/")).toBe(
      "https://letterboxd.com/bob/film/bar/"
    );
  });

  it("allows subdomains of letterboxd.com", () => {
    expect(normalizeLetterboxdActivityUrl("https://www.letterboxd.com/user/film/x/")).toBe(
      "https://www.letterboxd.com/user/film/x/"
    );
  });

  it("rejects other hosts", () => {
    expect(normalizeLetterboxdActivityUrl("https://evil.com/letterboxd.com/")).toBeNull();
    expect(normalizeLetterboxdActivityUrl("https://notletterboxd.com/foo")).toBeNull();
  });

  it("returns null for empty or invalid", () => {
    expect(normalizeLetterboxdActivityUrl(null)).toBeNull();
    expect(normalizeLetterboxdActivityUrl("")).toBeNull();
    expect(normalizeLetterboxdActivityUrl("   ")).toBeNull();
    expect(normalizeLetterboxdActivityUrl("not a url")).toBeNull();
  });
});
