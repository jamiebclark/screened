/** Mirrors Prisma enums for client-safe use (do not import `@/generated/prisma` in client components). */

export const ListAccessRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  DENIED: "DENIED",
} as const;

export type ListAccessRequestStatus =
  (typeof ListAccessRequestStatus)[keyof typeof ListAccessRequestStatus];

export const NotificationType = {
  LIST_ACCESS_REQUEST: "LIST_ACCESS_REQUEST",
  FRIEND_REQUEST: "FRIEND_REQUEST",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
