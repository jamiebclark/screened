import { ProfileContentVisibility } from "@/generated/prisma";

export function sortedFriendshipUserIds(
  a: string,
  b: string,
): { userLowId: string; userHighId: string } {
  if (a < b) return { userLowId: a, userHighId: b };
  return { userLowId: b, userHighId: a };
}

/**
 * In this app, routes under (app) require sign-in, so "public" means any Screened user.
 * `FRIENDS` is limited to users linked via {@link areFriends}.
 */
export function canViewProfileContent({
  isOwner,
  visibility,
  isFriend,
}: {
  isOwner: boolean;
  visibility: ProfileContentVisibility;
  isFriend: boolean;
}): boolean {
  if (isOwner) return true;
  if (visibility === "PUBLIC") return true;
  return isFriend;
}
