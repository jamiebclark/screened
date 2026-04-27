import { describe, it, expect } from "vitest";
import { safeCallbackPath } from "./safe-callback-path";

describe("safeCallbackPath", () => {
  it("returns / for null", () => {
    expect(safeCallbackPath(null)).toBe("/");
  });

  it("returns / for non-string", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(safeCallbackPath(42 as any)).toBe("/");
  });

  it("returns / for empty string", () => {
    expect(safeCallbackPath("")).toBe("/");
  });

  it("passes through a normal app path", () => {
    expect(safeCallbackPath("/dashboard")).toBe("/dashboard");
  });

  it("passes through a nested path", () => {
    expect(safeCallbackPath("/settings/plex")).toBe("/settings/plex");
  });

  it("passes through a path with query string", () => {
    expect(safeCallbackPath("/search?q=inception")).toBe(
      "/search?q=inception",
    );
  });

  it("trims surrounding whitespace before validating", () => {
    expect(safeCallbackPath("  /home  ")).toBe("/home");
  });

  it("blocks external URLs (no leading slash)", () => {
    expect(safeCallbackPath("https://evil.com")).toBe("/");
  });

  it("blocks protocol-relative URLs (double slash)", () => {
    expect(safeCallbackPath("//evil.com")).toBe("/");
  });

  it("blocks open-redirect via newline injection", () => {
    expect(safeCallbackPath("/legit\nhttps://evil.com")).toBe("/");
    expect(safeCallbackPath("/legit\rhttps://evil.com")).toBe("/");
  });

  it("allows a path that is exactly /", () => {
    expect(safeCallbackPath("/")).toBe("/");
  });
});
