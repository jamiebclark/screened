import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIST_VISIBILITY,
  DISCOVERABLE_VISIBILITIES,
  LIST_VISIBILITY_OPTIONS,
  ListVisibility,
  parseListVisibility,
  resolveListAccess,
} from "./list-visibility";

describe("resolveListAccess", () => {
  it("grants PUBLIC lists to everyone", () => {
    expect(
      resolveListAccess({
        visibility: "PUBLIC",
        hasSession: false,
        isMember: false,
      }),
    ).toBe("granted");
    expect(
      resolveListAccess({
        visibility: "PUBLIC",
        hasSession: true,
        isMember: false,
      }),
    ).toBe("granted");
    expect(
      resolveListAccess({
        visibility: "PUBLIC",
        hasSession: true,
        isMember: true,
      }),
    ).toBe("granted");
  });

  it("asks anonymous visitors to sign in for MEMBERS lists", () => {
    expect(
      resolveListAccess({
        visibility: "MEMBERS",
        hasSession: false,
        isMember: false,
      }),
    ).toBe("login");
  });

  it("grants MEMBERS lists to any signed-in user", () => {
    expect(
      resolveListAccess({
        visibility: "MEMBERS",
        hasSession: true,
        isMember: false,
      }),
    ).toBe("granted");
    expect(
      resolveListAccess({
        visibility: "MEMBERS",
        hasSession: true,
        isMember: true,
      }),
    ).toBe("granted");
  });

  it("asks anonymous visitors to sign in for PRIVATE lists", () => {
    expect(
      resolveListAccess({
        visibility: "PRIVATE",
        hasSession: false,
        isMember: false,
      }),
    ).toBe("login");
  });

  it("forbids signed-in non-members on PRIVATE lists", () => {
    expect(
      resolveListAccess({
        visibility: "PRIVATE",
        hasSession: true,
        isMember: false,
      }),
    ).toBe("forbidden");
  });

  it("grants PRIVATE lists to members", () => {
    expect(
      resolveListAccess({
        visibility: "PRIVATE",
        hasSession: true,
        isMember: true,
      }),
    ).toBe("granted");
  });
});

describe("parseListVisibility", () => {
  it("accepts the three tier values", () => {
    expect(parseListVisibility("PUBLIC")).toBe("PUBLIC");
    expect(parseListVisibility("MEMBERS")).toBe("MEMBERS");
    expect(parseListVisibility("PRIVATE")).toBe("PRIVATE");
  });

  it("rejects anything else", () => {
    expect(parseListVisibility(undefined)).toBeNull();
    expect(parseListVisibility(null)).toBeNull();
    expect(parseListVisibility("public")).toBeNull();
    expect(parseListVisibility(true)).toBeNull();
    expect(parseListVisibility("")).toBeNull();
    expect(parseListVisibility({})).toBeNull();
  });
});

describe("visibility metadata", () => {
  it("defaults new lists to site members, never public", () => {
    expect(DEFAULT_LIST_VISIBILITY).toBe(ListVisibility.MEMBERS);
  });

  it("lets signed-in users discover public and site-member lists only", () => {
    expect(DISCOVERABLE_VISIBILITIES).toEqual(["PUBLIC", "MEMBERS"]);
  });

  it("describes every tier with owner-facing copy", () => {
    expect(LIST_VISIBILITY_OPTIONS.map((o) => o.value)).toEqual([
      "PUBLIC",
      "MEMBERS",
      "PRIVATE",
    ]);
    expect(LIST_VISIBILITY_OPTIONS.map((o) => o.label)).toEqual([
      "Public",
      "Site members",
      "Private",
    ]);
    for (const option of LIST_VISIBILITY_OPTIONS) {
      expect(option.description.length).toBeGreaterThan(0);
    }
  });
});
