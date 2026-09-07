import { utcDayEndExclusive, utcDayStart } from "@/lib/watch-entry-merge";

export type ChallengeWindow = {
  startsAt: Date | null;
  endsAt: Date | null;
};

export type ParseChallengeWindowResult =
  | { ok: true; value: ChallengeWindow }
  | { ok: false; error: string };

const INVALID_DATE_ERROR = "Challenge dates must be calendar dates";
const END_BEFORE_START_ERROR =
  "Challenge end date cannot be before the start date";

/** Parses one field's value: absent -> "keep current", null -> "clear", else a date string. */
function parseField(
  raw: unknown,
):
  | { present: false }
  | { present: true; value: Date | null }
  | { error: string } {
  if (raw === undefined) return { present: false };
  if (raw === null) return { present: true, value: null };
  if (typeof raw !== "string") return { error: INVALID_DATE_ERROR };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { error: INVALID_DATE_ERROR };
  return { present: true, value: utcDayStart(parsed) };
}

export function parseChallengeWindowInput(
  input: { challengeStartsAt?: unknown; challengeEndsAt?: unknown },
  current: ChallengeWindow,
): ParseChallengeWindowResult {
  const start = parseField(input.challengeStartsAt);
  if ("error" in start) return { ok: false, error: start.error };
  const end = parseField(input.challengeEndsAt);
  if ("error" in end) return { ok: false, error: end.error };

  const startsAt = start.present ? start.value : current.startsAt;
  const endsAt = end.present ? end.value : current.endsAt;

  if (
    startsAt != null &&
    endsAt != null &&
    endsAt.getTime() < startsAt.getTime()
  ) {
    return { ok: false, error: END_BEFORE_START_ERROR };
  }

  return { ok: true, value: { startsAt, endsAt } };
}

export function challengeWindowBounds(
  window: ChallengeWindow,
): { gte?: Date; lt?: Date } | null {
  if (window.startsAt == null && window.endsAt == null) return null;
  const bounds: { gte?: Date; lt?: Date } = {};
  if (window.startsAt != null) bounds.gte = window.startsAt;
  if (window.endsAt != null) bounds.lt = utcDayEndExclusive(window.endsAt);
  return bounds;
}

export function hasChallengeWindow(window: ChallengeWindow): boolean {
  return window.startsAt != null || window.endsAt != null;
}

export function isWithinChallengeWindow(
  watchedAt: Date,
  window: ChallengeWindow,
): boolean {
  const bounds = challengeWindowBounds(window);
  if (bounds == null) return true;
  const t = watchedAt.getTime();
  if (bounds.gte != null && t < bounds.gte.getTime()) return false;
  if (bounds.lt != null && t >= bounds.lt.getTime()) return false;
  return true;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatUtcDate(d: Date, includeYear = true): string {
  const base = `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
  return includeYear ? `${base} ${d.getUTCFullYear()}` : base;
}

export function describeChallengeWindow(
  window: ChallengeWindow,
): string | null {
  const { startsAt, endsAt } = window;
  if (startsAt != null && endsAt != null) {
    const sameYear = startsAt.getUTCFullYear() === endsAt.getUTCFullYear();
    return `${formatUtcDate(startsAt, !sameYear)} – ${formatUtcDate(endsAt)}`;
  }
  if (startsAt != null) return `From ${formatUtcDate(startsAt)}`;
  if (endsAt != null) return `Up to ${formatUtcDate(endsAt)}`;
  return null;
}
