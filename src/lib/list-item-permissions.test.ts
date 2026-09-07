import { describe, expect, it } from "vitest";
import { canCurateListItems } from "./list-item-permissions";

describe("canCurateListItems", () => {
  it("returns true for the list owner regardless of member role", () => {
    expect(canCurateListItems({ isOwner: true, memberRole: null })).toBe(true);
  });

  it("returns true for a member with role OWNER", () => {
    expect(canCurateListItems({ isOwner: false, memberRole: "OWNER" })).toBe(
      true,
    );
  });

  it("returns true for a member with role CONTRIBUTOR", () => {
    expect(
      canCurateListItems({ isOwner: false, memberRole: "CONTRIBUTOR" }),
    ).toBe(true);
  });

  it("returns false for a member with role VIEWER", () => {
    expect(canCurateListItems({ isOwner: false, memberRole: "VIEWER" })).toBe(
      false,
    );
  });

  it("returns false for a non-member", () => {
    expect(canCurateListItems({ isOwner: false, memberRole: null })).toBe(
      false,
    );
  });
});
