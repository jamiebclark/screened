import { describe, it, expect } from "vitest";
import { canViewProfileContent, sortedFriendshipUserIds } from "./profile-visibility";

describe("profile-visibility", () => {
  it("orders friendship ids (lexicographic low / high)", () => {
    const low = "a_user";
    const high = "b_user";
    expect(sortedFriendshipUserIds(low, high)).toEqual({ userLowId: low, userHighId: high });
    expect(sortedFriendshipUserIds(high, low)).toEqual({ userLowId: low, userHighId: high });
  });

  it("treats equal ids as the same pair", () => {
    const id = "same_id";
    expect(sortedFriendshipUserIds(id, id)).toEqual({ userLowId: id, userHighId: id });
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
