import { auth } from "@/lib/auth";
import { getFriendActivityFeed } from "@/lib/activity-feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Users } from "lucide-react";

function posterUrl(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function ActivityPage() {
  const session = await auth();
  const events = await getFriendActivityFeed(session!.user.id);

  if (events.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Friends activity</h1>
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1 max-w-xs">
            <p className="font-medium">Nothing here yet</p>
            <p className="text-sm text-muted-foreground">
              Add friends to see what they&apos;re watching and what they&apos;re
              adding to lists.
            </p>
          </div>
          <Button asChild>
            <Link href="/settings/friends">Find friends</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Friends activity</h1>
      <ul className="space-y-1">
        {events.map((event) => {
          const href =
            event.mediaItem.type === "movie"
              ? `/movies/${event.mediaItem.tmdbId}`
              : `/tv/${event.mediaItem.tmdbId}`;
          const poster = posterUrl(event.mediaItem.poster);
          const timestamp =
            event.kind === "watched" ? event.watchedAt : event.addedAt;

          return (
            <li
              key={event.id}
              className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/40 transition-colors"
            >
              <Link href={`/profile/${event.actorId}`} className="shrink-0 mt-0.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={event.actorAvatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {initials(event.actorName)}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <Link
                    href={`/profile/${event.actorId}`}
                    className="font-medium hover:underline"
                  >
                    {event.actorName}
                  </Link>{" "}
                  {event.kind === "watched" ? (
                    <>
                      watched{" "}
                      <Link href={href} className="font-medium hover:underline">
                        {event.mediaItem.title}
                      </Link>
                      {event.mediaItem.year && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({event.mediaItem.year})
                        </span>
                      )}
                      {event.rating && (
                        <span className="text-yellow-400 ml-1">
                          ★ {event.rating.toFixed(1)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      added{" "}
                      <Link href={href} className="font-medium hover:underline">
                        {event.mediaItem.title}
                      </Link>
                      {event.mediaItem.year && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({event.mediaItem.year})
                        </span>
                      )}{" "}
                      to{" "}
                      <Link
                        href={`/lists/${event.listSlug}`}
                        className="font-medium hover:underline"
                      >
                        {event.listName}
                      </Link>
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {relativeTime(timestamp)}
                </p>
              </div>

              {poster && (
                <Link href={href} className="shrink-0">
                  <Image
                    src={poster}
                    alt={event.mediaItem.title}
                    width={36}
                    height={54}
                    className="rounded object-cover"
                    unoptimized
                  />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
