import { describe, it, expect } from "vitest";
import { canViewProfileContent, sortedFriendshipUserIds } from "./profile-visibility";

describe("profile-visibility", () => {
  it("orders friendship ids", () => {
    const a = "a_user";
    const b = "b_user";
    expect(sortedFriendshipUserIds(b, a)).toEqual({ userLowId: a, userHighId: b });
  });

  it("owner always can view", () => {
    expect(
      canViewProfileContent({
        isOwner: true,
        visibility: "FRIENDS",
        isFriend: false,
      })
    ).toBe(true);
  });

  it("public allows non-owners", () => {
    expect(
      canViewProfileContent({
        isOwner: false,
        visibility: "PUBLIC",
        isFriend: false,
      })
    ).toBe(true);
  });

  it("friends visibility requires friend", () => {
    expect(
      canViewProfileContent({
        isOwner: false,
        visibility: "FRIENDS",
        isFriend: true,
      })
    ).toBe(true);
    expect(
      canViewProfileContent({
        isOwner: false,
        visibility: "FRIENDS",
        isFriend: false,
      })
    ).toBe(false);
  });
});
