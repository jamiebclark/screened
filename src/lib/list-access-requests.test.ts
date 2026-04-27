import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listFindUnique: vi.fn(),
  notificationCreateMany: vi.fn(),
  notificationUpdateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    list: { findUnique: mocks.listFindUnique },
    notification: {
      createMany: mocks.notificationCreateMany,
      updateMany: mocks.notificationUpdateMany,
    },
  },
}));

import {
  listAdminUserIdsForList,
  notifyAdminsOfPendingAccessRequest,
  markAccessRequestNotificationsRead,
} from "./list-access-requests";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listAdminUserIdsForList", () => {
  it("returns the owner id when list exists", async () => {
    mocks.listFindUnique.mockResolvedValueOnce({ ownerId: "owner_1" });
    const ids = await listAdminUserIdsForList("list_1");
    expect(ids).toEqual(["owner_1"]);
  });

  it("returns empty array when list does not exist", async () => {
    mocks.listFindUnique.mockResolvedValueOnce(null);
    const ids = await listAdminUserIdsForList("unknown_list");
    expect(ids).toEqual([]);
  });
});

describe("notifyAdminsOfPendingAccessRequest", () => {
  it("creates a notification for each admin", async () => {
    mocks.listFindUnique.mockResolvedValueOnce({ ownerId: "owner_1" });
    mocks.notificationCreateMany.mockResolvedValueOnce({ count: 1 });

    await notifyAdminsOfPendingAccessRequest("list_1", "req_abc");

    expect(mocks.notificationCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "owner_1",
            listAccessRequestId: "req_abc",
          }),
        ]),
      }),
    );
  });

  it("does nothing when the list has no admins", async () => {
    mocks.listFindUnique.mockResolvedValueOnce(null);

    await notifyAdminsOfPendingAccessRequest("unknown_list", "req_abc");

    expect(mocks.notificationCreateMany).not.toHaveBeenCalled();
  });
});

describe("markAccessRequestNotificationsRead", () => {
  it("marks notifications for the request as read", async () => {
    mocks.notificationUpdateMany.mockResolvedValueOnce({ count: 2 });

    await markAccessRequestNotificationsRead("req_abc");

    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { listAccessRequestId: "req_abc" },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      }),
    );
  });
});
