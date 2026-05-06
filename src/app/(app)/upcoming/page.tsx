import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getUpcomingWatchlistItems,
  type UpcomingItem,
} from "@/lib/upcoming-queries";

export const metadata: Metadata = { title: "Upcoming" };

function formatReleaseDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 0 && diffDays <= 14) return `In ${diffDays} days`;

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

function posterUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

function ItemRow({ item }: { item: UpcomingItem }) {
  const type = item.type === "MOVIE" ? "movie" : "tv";
  const href = `/${type === "movie" ? "movies" : "tv"}/${item.tmdbId}`;
  const thumb = posterUrl(item.poster);

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
    >
      {thumb ? (
        <Image
          src={thumb}
          alt={item.title}
          width={28}
          height={42}
          className="rounded object-cover shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-7 h-10 rounded bg-muted shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {item.type === "MOVIE" ? "Movie" : "TV"}
        </p>
      </div>
      <span className="text-sm text-muted-foreground shrink-0">
        {formatReleaseDate(item.releaseDate)}
      </span>
    </Link>
  );
}

export default async function UpcomingPage() {
  const session = await auth();
  const { comingSoon, justReleased } = await getUpcomingWatchlistItems(
    session!.user.id,
  );

  const isEmpty = comingSoon.length === 0 && justReleased.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Upcoming</h1>
          <p className="text-sm text-muted-foreground">
            Releases from your watchlist
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl max-w-sm mx-auto">
          <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">Nothing coming up</p>
          <p className="text-sm text-muted-foreground mb-5">
            Add titles to your watchlist to track upcoming releases.
          </p>
          <Button size="sm" asChild>
            <Link href="/watchlist">
              <Bookmark className="h-4 w-4" />
              Go to watchlist
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {comingSoon.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-3">Coming Soon</h3>
              <div className="space-y-1">
                {comingSoon.map((item) => (
                  <ItemRow key={`${item.type}-${item.tmdbId}`} item={item} />
                ))}
              </div>
            </section>
          )}

          {justReleased.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-3">Just Released</h3>
              <div className="space-y-1">
                {justReleased.map((item) => (
                  <ItemRow key={`${item.type}-${item.tmdbId}`} item={item} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
