import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  friendshipFindUnique: vi.fn(),
  friendRequestFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: { findUnique: mocks.friendshipFindUnique },
    friendRequest: { findUnique: mocks.friendRequestFindUnique },
  },
}));

import { areFriends, getProfileFriendState } from "./friendship";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("areFriends", () => {
  it("returns true when userId equals otherUserId (self)", async () => {
    expect(await areFriends("alice", "alice")).toBe(true);
    expect(mocks.friendshipFindUnique).not.toHaveBeenCalled();
  });

  it("returns true when a friendship row exists", async () => {
    mocks.friendshipFindUnique.mockResolvedValueOnce({ id: "f1" });
    expect(await areFriends("alice", "bob")).toBe(true);
  });

  it("returns false when no friendship row exists", async () => {
    mocks.friendshipFindUnique.mockResolvedValueOnce(null);
    expect(await areFriends("alice", "bob")).toBe(false);
  });

  it("queries with sorted ids (lexicographic low before high)", async () => {
    mocks.friendshipFindUnique.mockResolvedValueOnce(null);
    await areFriends("zzz", "aaa");
    expect(mocks.friendshipFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userLowId_userHighId: { userLowId: "aaa", userHighId: "zzz" },
        },
      }),
    );
  });
});

describe("getProfileFriendState", () => {
  it("returns 'none' when viewerId is undefined", async () => {
    expect(await getProfileFriendState(undefined, "alice")).toEqual({
      kind: "none",
    });
  });

  it("returns 'self' when viewerId equals profileUserId", async () => {
    expect(await getProfileFriendState("alice", "alice")).toEqual({
      kind: "self",
    });
  });

  it("returns 'friends' when a friendship row exists", async () => {
    mocks.friendshipFindUnique.mockResolvedValueOnce({ id: "f1" });
    expect(await getProfileFriendState("alice", "bob")).toEqual({
      kind: "friends",
    });
  });

  it("returns 'outgoing' when a pending request from viewer exists", async () => {
    mocks.friendshipFindUnique.mockResolvedValueOnce(null);
    mocks.friendRequestFindUnique
      .mockResolvedValueOnce({ id: "req1" }) // outgoing
      .mockResolvedValueOnce(null);
    expect(await getProfileFriendState("alice", "bob")).toEqual({
      kind: "outgoing",
      requestId: "req1",
    });
  });

  it("returns 'incoming' when a pending request to viewer exists", async () => {
    mocks.friendshipFindUnique.mockResolvedValueOnce(null);
    mocks.friendRequestFindUnique
      .mockResolvedValueOnce(null) // no outgoing
      .mockResolvedValueOnce({ id: "req2" }); // incoming
    expect(await getProfileFriendState("alice", "bob")).toEqual({
      kind: "incoming",
      requestId: "req2",
    });
  });

  it("returns 'none' when no friendship or requests exist", async () => {
    mocks.friendshipFindUnique.mockResolvedValueOnce(null);
    mocks.friendRequestFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    expect(await getProfileFriendState("alice", "bob")).toEqual({
      kind: "none",
    });
  });
});
