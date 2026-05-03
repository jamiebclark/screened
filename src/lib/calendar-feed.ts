import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";

interface IcsEvent {
  uid: string;
  dtstart: Date;
  summary: string;
  description?: string;
  url?: string;
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    chunks.push(line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n ");
}

function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDateTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${mi}${s}Z`;
}

function nextDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function renderEvent(event: IcsEvent, dtstamp: Date): string {
  const lines: string[] = [
    "BEGIN:VEVENT",
    foldLine(`UID:${event.uid}`),
    foldLine(`DTSTAMP:${formatDateTime(dtstamp)}`),
    foldLine(`DTSTART;VALUE=DATE:${formatDateOnly(event.dtstart)}`),
    foldLine(`DTEND;VALUE=DATE:${formatDateOnly(nextDay(event.dtstart))}`),
    foldLine(`SUMMARY:${escapeText(event.summary)}`),
  ];
  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeText(event.description)}`));
  }
  if (event.url) {
    lines.push(foldLine(`URL:${event.url}`));
  }
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export async function buildCalendarFeed(
  userId: string,
  appUrl: string,
): Promise<string> {
  const statuses = await prisma.userMediaStatus.findMany({
    where: {
      userId,
      status: { in: ["WATCHLIST", "WATCHING"] },
      mediaItem: { releaseDate: { not: null } },
    },
    select: {
      mediaItem: {
        select: {
          id: true,
          tmdbId: true,
          type: true,
          title: true,
          overview: true,
          releaseDate: true,
        },
      },
    },
    orderBy: { mediaItem: { releaseDate: "asc" } },
  });

  const dtstamp = new Date();
  const events = statuses.map(({ mediaItem }) => {
    const typeSlug = mediaItem.type === MediaType.MOVIE ? "movies" : "tv";
    const url = `${appUrl}/${typeSlug}/${mediaItem.tmdbId}`;
    const typeLabel = mediaItem.type === MediaType.MOVIE ? "Movie" : "TV";
    return renderEvent(
      {
        uid: `screened-${mediaItem.id}@screened`,
        dtstart: mediaItem.releaseDate!,
        summary: `${mediaItem.title} — ${typeLabel} Release`,
        description: mediaItem.overview ?? undefined,
        url,
      },
      dtstamp,
    );
  });

  const calLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Screened//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    foldLine("X-WR-CALNAME:Screened — Upcoming Releases"),
    foldLine(
      "X-WR-CALDESC:Release dates for titles on your Screened watchlist",
    ),
    ...events,
    "END:VCALENDAR",
  ];

  return calLines.join("\r\n") + "\r\n";
}
