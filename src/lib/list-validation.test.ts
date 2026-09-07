import { describe, expect, it } from "vitest";
import {
  LIST_DESCRIPTION_MAX_LENGTH,
  LIST_NAME_MAX_LENGTH,
  validateListDetails,
} from "./list-validation";

describe("validateListDetails", () => {
  it("omits absent keys from the result", () => {
    const result = validateListDetails({});
    expect(result).toEqual({ ok: true, value: {} });
  });

  it("trims and accepts a valid name", () => {
    const result = validateListDetails({ name: "  My List  " });
    expect(result).toEqual({ ok: true, value: { name: "My List" } });
  });

  it("rejects a whitespace-only name", () => {
    const result = validateListDetails({ name: "   " });
    expect(result).toEqual({ ok: false, error: "List name is required" });
  });

  it("rejects an empty name", () => {
    const result = validateListDetails({ name: "" });
    expect(result).toEqual({ ok: false, error: "List name is required" });
  });

  it("accepts a name exactly at the length limit", () => {
    const name = "a".repeat(LIST_NAME_MAX_LENGTH);
    const result = validateListDetails({ name });
    expect(result).toEqual({ ok: true, value: { name } });
  });

  it("rejects a name one character over the limit", () => {
    const name = "a".repeat(LIST_NAME_MAX_LENGTH + 1);
    const result = validateListDetails({ name });
    expect(result).toEqual({
      ok: false,
      error: "List name must be 100 characters or fewer",
    });
  });

  it("rejects a non-string name", () => {
    const result = validateListDetails({ name: 42 });
    expect(result).toEqual({ ok: false, error: "Name must be text" });
  });

  it("clears the description to null for null input", () => {
    const result = validateListDetails({ description: null });
    expect(result).toEqual({ ok: true, value: { description: null } });
  });

  it("clears the description to null for empty string", () => {
    const result = validateListDetails({ description: "" });
    expect(result).toEqual({ ok: true, value: { description: null } });
  });

  it("clears the description to null for whitespace-only string", () => {
    const result = validateListDetails({ description: "   " });
    expect(result).toEqual({ ok: true, value: { description: null } });
  });

  it("trims and accepts a valid description", () => {
    const result = validateListDetails({ description: "  hello  " });
    expect(result).toEqual({ ok: true, value: { description: "hello" } });
  });

  it("accepts a description exactly at the length limit", () => {
    const description = "a".repeat(LIST_DESCRIPTION_MAX_LENGTH);
    const result = validateListDetails({ description });
    expect(result).toEqual({ ok: true, value: { description } });
  });

  it("rejects a description one character over the limit", () => {
    const description = "a".repeat(LIST_DESCRIPTION_MAX_LENGTH + 1);
    const result = validateListDetails({ description });
    expect(result).toEqual({
      ok: false,
      error: "Description must be 1000 characters or fewer",
    });
  });

  it("rejects a non-string description", () => {
    const result = validateListDetails({ description: 42 });
    expect(result).toEqual({ ok: false, error: "Description must be text" });
  });

  it("passes emoji and markdown through literally, not stripped or escaped", () => {
    const result = validateListDetails({
      name: "🎬 Best <b>Movies</b>",
      description: "**bold** & emoji 🍿",
    });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "🎬 Best <b>Movies</b>",
        description: "**bold** & emoji 🍿",
      },
    });
  });
});
