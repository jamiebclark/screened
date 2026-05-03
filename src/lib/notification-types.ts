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
  FRIEND_WATCHED_YOUR_WATCHLIST: "FRIEND_WATCHED_YOUR_WATCHLIST",
  WATCH_PARTY_INVITE: "WATCH_PARTY_INVITE",
  WATCH_PARTY_CONFIRM: "WATCH_PARTY_CONFIRM",
} as const;

export const WatchPartyInviteStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
} as const;

export type WatchPartyInviteStatus =
  (typeof WatchPartyInviteStatus)[keyof typeof WatchPartyInviteStatus];

export const WatchPartyStatus = {
  SCHEDULED: "SCHEDULED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

export type WatchPartyStatus =
  (typeof WatchPartyStatus)[keyof typeof WatchPartyStatus];

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];
