/**
 * List visibility tiers. Mirrors the Prisma `ListVisibility` enum for
 * client-safe use (do not import `@/generated/prisma` in client components).
 *
 * - PUBLIC:  anyone on the internet, no account required
 * - MEMBERS: any signed-in Screened user
 * - PRIVATE: the owner and list members only
 */
export const ListVisibility = {
  PUBLIC: "PUBLIC",
  MEMBERS: "MEMBERS",
  PRIVATE: "PRIVATE",
} as const;

export type ListVisibility =
  (typeof ListVisibility)[keyof typeof ListVisibility];

export const DEFAULT_LIST_VISIBILITY: ListVisibility = ListVisibility.MEMBERS;

/** Tiers a signed-in user may browse without being a member. */
export const DISCOVERABLE_VISIBILITIES: ListVisibility[] = [
  ListVisibility.PUBLIC,
  ListVisibility.MEMBERS,
];

export type ListVisibilityIcon = "globe" | "users" | "lock";

export const LIST_VISIBILITY_OPTIONS: {
  value: ListVisibility;
  label: string;
  description: string;
  icon: ListVisibilityIcon;
}[] = [
  {
    value: ListVisibility.PUBLIC,
    label: "Public",
    description: "Anyone on the internet, even without an account",
    icon: "globe",
  },
  {
    value: ListVisibility.MEMBERS,
    label: "Site members",
    description: "Anyone signed in to Screened",
    icon: "users",
  },
  {
    value: ListVisibility.PRIVATE,
    label: "Private",
    description: "Only list members",
    icon: "lock",
  },
];

export function getListVisibilityOption(visibility: ListVisibility) {
  return (
    LIST_VISIBILITY_OPTIONS.find((o) => o.value === visibility) ??
    LIST_VISIBILITY_OPTIONS[1]
  );
}

/** Returns the tier when `input` is one of the three enum strings, else null. */
export function parseListVisibility(input: unknown): ListVisibility | null {
  if (typeof input !== "string") return null;
  return (Object.values(ListVisibility) as string[]).includes(input)
    ? (input as ListVisibility)
    : null;
}

/**
 * - granted:   render / return the list
 * - login:     no session and the tier needs one → redirect to sign in / 401
 * - forbidden: signed in but not a member of a PRIVATE list → gate / 403
 */
export type ListAccessDecision = "granted" | "login" | "forbidden";

export function resolveListAccess(args: {
  visibility: ListVisibility;
  hasSession: boolean;
  /** Owner or ListMember row. */
  isMember: boolean;
}): ListAccessDecision {
  const { visibility, hasSession, isMember } = args;
  if (visibility === ListVisibility.PUBLIC) return "granted";
  if (!hasSession) return "login";
  if (visibility === ListVisibility.MEMBERS) return "granted";
  return isMember ? "granted" : "forbidden";
}
