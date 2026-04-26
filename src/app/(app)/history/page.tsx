import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/utils";
import { Eye, Film, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MediaType } from "@/generated/prisma";

function formatGroupDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  if (diffDays < 365) return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function HistoryPage() {
  const session = await auth();

  const watched = await prisma.watchEntry.findMany({
    where: { userId: session!.user.id },
    include: { mediaItem: true },
    orderBy: { watchedAt: "desc" },
    take: 200,
  });

  // Group entries by calendar day
  const groups: { label: string; date: Date; items: typeof watched }[] = [];

  for (const entry of watched) {
    const date = entry.watchedAt;
    const label = formatGroupDate(date);
    const last = groups[groups.length - 1];

    if (last && last.label === label) {
      last.items.push(entry);
    } else {
      groups.push({ label, date, items: [entry] });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Eye className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Watch History</h1>
          <p className="text-sm text-muted-foreground">{watched.length} watch entr{watched.length !== 1 ? "ies" : "y"}</p>
        </div>
      </div>

      {watched.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No watch history yet</p>
          <p className="text-sm mt-1">Mark something as watched or sync your Plex history to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 sticky top-16 bg-background/95 backdrop-blur py-1 -mx-4 px-4">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map((entry) => {
                  const href =
                    entry.mediaItem.type === MediaType.MOVIE
                      ? `/movies/${entry.mediaItem.tmdbId}`
                      : `/tv/${entry.mediaItem.tmdbId}`;
                  const poster = tmdbImageUrl(entry.mediaItem.poster, "w92");
                  const isMovie = entry.mediaItem.type === MediaType.MOVIE;

                  return (
                    <Link
                      key={entry.id}
                      href={href}
                      className="flex items-center gap-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors p-3 group"
                    >
                      <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted">
                        {poster ? (
                          <Image
                            src={poster}
                            alt={entry.mediaItem.title}
                            width={40}
                            height={56}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            {isMovie ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">
                          {entry.mediaItem.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {isMovie ? "Movie" : "TV"}
                          </Badge>
                          {entry.mediaItem.year && (
                            <span className="text-xs text-muted-foreground">{entry.mediaItem.year}</span>
                          )}
                        </div>
                      </div>

                      <time className="text-xs text-muted-foreground shrink-0">
                        {formatTime(entry.watchedAt)}
                      </time>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {watched.length === 200 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Showing your 200 most recent. Older history is still tracked.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
