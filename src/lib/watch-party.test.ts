import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  watchPartyFindUnique: vi.fn(),
  watchPartyUpdate: vi.fn(),
  watchPartyInviteCreate: vi.fn(),
  notificationCreateMany: vi.fn(),
  discordConnectionFindMany: vi.fn(),
  transaction: vi.fn(),
  listFriendUserIds: vi.fn(),
  sendDM: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    watchParty: {
      findUnique: mocks.watchPartyFindUnique,
      update: mocks.watchPartyUpdate,
    },
    $transaction: mocks.transaction,
    discordConnection: { findMany: mocks.discordConnectionFindMany },
  },
}));

vi.mock("@/lib/friendship", () => ({
  listFriendUserIds: mocks.listFriendUserIds,
}));

vi.mock("@/lib/discord", () => ({
  discordFeatures: () => ({ bot: false, oauth: false }),
  sendDM: mocks.sendDM,
}));

import {
  addInvitesToWatchParty,
  cancelWatchParty,
  rescheduleWatchParty,
} from "./watch-party";

const HOST = "host_1";
const FRIEND_A = "friend_a";
const FRIEND_B = "friend_b";
const STRANGER = "stranger_1";

function makeParty(
  overrides: Partial<{
    hostId: string;
    status: string;
    invites: { userId: string }[];
  }> = {},
) {
  return {
    hostId: HOST,
    status: "SCHEDULED",
    invites: [],
    mediaItem: {
      id: "mi_1",
      tmdbId: 550,
      type: "MOVIE",
      title: "Fight Club",
      year: 1999,
      poster: null,
    },
    host: { name: "Host User" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();

  mocks.transaction.mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        watchPartyInvite: { create: mocks.watchPartyInviteCreate },
        notification: { createMany: mocks.notificationCreateMany },
      };
      return fn(tx);
    },
  );

  mocks.watchPartyInviteCreate.mockImplementation(
    ({ data }: { data: { watchPartyId: string; userId: string } }) =>
      Promise.resolve({ id: `inv_${data.userId}`, ...data }),
  );

  mocks.notificationCreateMany.mockResolvedValue({ count: 1 });
  mocks.discordConnectionFindMany.mockResolvedValue([]);
});

describe("addInvitesToWatchParty", () => {
  it("throws when the party does not exist", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(null);
    await expect(
      addInvitesToWatchParty("wp_1", HOST, [FRIEND_A]),
    ).rejects.toThrow("Watch party not found");
  });

  it("throws when the caller is not the host", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(makeParty());
    await expect(
      addInvitesToWatchParty("wp_1", FRIEND_A, [FRIEND_B]),
    ).rejects.toThrow("Only the host can invite");
  });

  it("throws when the party is not SCHEDULED", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(
      makeParty({ status: "CONFIRMED" }),
    );
    await expect(
      addInvitesToWatchParty("wp_1", HOST, [FRIEND_A]),
    ).rejects.toThrow("Party is not scheduled");
  });

  it("throws when the host tries to invite themselves", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(makeParty());
    mocks.listFriendUserIds.mockResolvedValueOnce([FRIEND_A]);
    await expect(addInvitesToWatchParty("wp_1", HOST, [HOST])).rejects.toThrow(
      "Host cannot be an invitee",
    );
  });

  it("throws when an invitee is not a friend", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(makeParty());
    mocks.listFriendUserIds.mockResolvedValueOnce([FRIEND_A]);
    await expect(
      addInvitesToWatchParty("wp_1", HOST, [STRANGER]),
    ).rejects.toThrow("All invitees must be friends");
  });

  it("returns an empty array and skips the transaction when all invitees are already invited", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(
      makeParty({ invites: [{ userId: FRIEND_A }] }),
    );
    mocks.listFriendUserIds.mockResolvedValueOnce([FRIEND_A]);

    const result = await addInvitesToWatchParty("wp_1", HOST, [FRIEND_A]);

    expect(result).toEqual([]);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates invites and notifications only for users not already invited", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(
      makeParty({ invites: [{ userId: FRIEND_A }] }),
    );
    mocks.listFriendUserIds.mockResolvedValueOnce([FRIEND_A, FRIEND_B]);

    await addInvitesToWatchParty("wp_1", HOST, [FRIEND_A, FRIEND_B]);

    expect(mocks.watchPartyInviteCreate).toHaveBeenCalledTimes(1);
    expect(mocks.watchPartyInviteCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: FRIEND_B }),
      }),
    );
    expect(mocks.notificationCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: FRIEND_B }),
        ]),
      }),
    );
  });

  it("creates invites for all provided friends when none are already invited", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(makeParty());
    mocks.listFriendUserIds.mockResolvedValueOnce([FRIEND_A, FRIEND_B]);

    const result = await addInvitesToWatchParty("wp_1", HOST, [
      FRIEND_A,
      FRIEND_B,
    ]);

    expect(result).toHaveLength(2);
    expect(mocks.watchPartyInviteCreate).toHaveBeenCalledTimes(2);
  });

  it("does not send Discord DMs when the bot is disabled", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(makeParty());
    mocks.listFriendUserIds.mockResolvedValueOnce([FRIEND_A]);

    await addInvitesToWatchParty("wp_1", HOST, [FRIEND_A]);

    expect(mocks.discordConnectionFindMany).not.toHaveBeenCalled();
    expect(mocks.sendDM).not.toHaveBeenCalled();
  });
});

describe("cancelWatchParty", () => {
  it("throws when the party does not exist", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(null);
    await expect(cancelWatchParty("wp_1", HOST)).rejects.toThrow(
      "Watch party not found",
    );
  });

  it("throws when the caller is not the host", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(
      makeParty({ hostId: "other_host" }),
    );
    await expect(cancelWatchParty("wp_1", HOST)).rejects.toThrow(
      "Only the host can cancel",
    );
  });

  it("throws when the party is not SCHEDULED", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(
      makeParty({ status: "CONFIRMED" }),
    );
    await expect(cancelWatchParty("wp_1", HOST)).rejects.toThrow(
      "Party is not scheduled",
    );
  });

  it("sets status to CANCELLED", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(makeParty());
    mocks.watchPartyUpdate.mockResolvedValueOnce({});

    await cancelWatchParty("wp_1", HOST);

    expect(mocks.watchPartyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
  });
});

describe("rescheduleWatchParty", () => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  it("throws when the party does not exist", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(null);
    await expect(rescheduleWatchParty("wp_1", HOST, future)).rejects.toThrow(
      "Watch party not found",
    );
  });

  it("throws when the caller is not the host", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(
      makeParty({ hostId: "other_host" }),
    );
    await expect(rescheduleWatchParty("wp_1", HOST, future)).rejects.toThrow(
      "Only the host can reschedule",
    );
  });

  it("throws when the party is not SCHEDULED", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(
      makeParty({ status: "CANCELLED" }),
    );
    await expect(rescheduleWatchParty("wp_1", HOST, future)).rejects.toThrow(
      "Party is not scheduled",
    );
  });

  it("updates scheduledFor to the new date", async () => {
    mocks.watchPartyFindUnique.mockResolvedValueOnce(makeParty());
    mocks.watchPartyUpdate.mockResolvedValueOnce({});

    await rescheduleWatchParty("wp_1", HOST, future);

    expect(mocks.watchPartyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { scheduledFor: future } }),
    );
  });
});
