/** Calendar-day helpers for /history/:year/:month/:day (server local timezone, matching existing history grouping). */

export const HISTORY_YEAR_MIN = 1900;
export const HISTORY_YEAR_MAX = 2100;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function historyYearPath(year: number): string {
  return `/history/${year}`;
}

export function historyMonthPath(year: number, month: number): string {
  return `/history/${year}/${pad2(month)}`;
}

export function historyDayPath(
  year: number,
  month: number,
  day: number,
): string {
  return `/history/${year}/${pad2(month)}/${pad2(day)}`;
}

export function localDayRange(
  year: number,
  month: number,
  day: number,
): { start: Date; end: Date } {
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start, end };
}

export function localMonthRange(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function localYearRange(year: number): { start: Date; end: Date } {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

export function parseYearSegment(s: string): number | null {
  if (!/^\d{4}$/.test(s)) return null;
  const y = parseInt(s, 10);
  if (y < HISTORY_YEAR_MIN || y > HISTORY_YEAR_MAX) return null;
  return y;
}

export function parseMonthSegment(s: string): number | null {
  if (!/^\d{1,2}$/.test(s)) return null;
  const m = parseInt(s, 10);
  if (m < 1 || m > 12) return null;
  return m;
}

export function parseDaySegment(s: string): number | null {
  if (!/^\d{1,2}$/.test(s)) return null;
  const d = parseInt(s, 10);
  if (d < 1 || d > 31) return null;
  return d;
}

/** Returns true if y-m-d is a real calendar date (no overflow). */
export function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  const t = new Date(year, month - 1, day);
  return (
    t.getFullYear() === year &&
    t.getMonth() === month - 1 &&
    t.getDate() === day
  );
}

export function monthCanonicalPath(
  year: number,
  month: number,
  monthSegment: string,
): string | null {
  const canon = pad2(month);
  if (monthSegment !== canon) return historyMonthPath(year, month);
  return null;
}

export function dayCanonicalPath(
  year: number,
  month: number,
  day: number,
  daySegment: string,
): string | null {
  const canon = pad2(day);
  if (daySegment !== canon) return historyDayPath(year, month, day);
  return null;
}

/** YYYY-MM-DD for search + dialog prefill */
export function toDateOnlyIso(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnlyIso(s: string | undefined | null): string | null {
  if (!s) return null;
  const m = DATE_ONLY_RE.exec(s.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!isValidCalendarDate(y, mo, d)) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

export function localCalendarParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function adjacentMonthHrefs(
  year: number,
  month: number,
): {
  prev: { year: number; month: number } | null;
  next: { year: number; month: number } | null;
} {
  let py = year;
  let pm = month - 1;
  if (pm < 1) {
    pm = 12;
    py -= 1;
  }
  let ny = year;
  let nm = month + 1;
  if (nm > 12) {
    nm = 1;
    ny += 1;
  }
  return {
    prev: py >= HISTORY_YEAR_MIN ? { year: py, month: pm } : null,
    next: ny <= HISTORY_YEAR_MAX ? { year: ny, month: nm } : null,
  };
}

export function adjacentYearHrefs(year: number): {
  prev: number | null;
  next: number | null;
} {
  return {
    prev: year > HISTORY_YEAR_MIN ? year - 1 : null,
    next: year < HISTORY_YEAR_MAX ? year + 1 : null,
  };
}
