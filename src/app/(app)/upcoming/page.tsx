import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { CalendarDays, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/media-card";
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

function PosterGrid({ items }: { items: UpcomingItem[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {items.map((item) => (
        <div key={`${item.type}-${item.tmdbId}`} className="space-y-1.5">
          <MediaCard
            tmdbId={item.tmdbId}
            type={item.type === "MOVIE" ? "movie" : "tv"}
            title={item.title}
            poster={item.poster}
            year={item.year}
          />
          <p className="text-xs text-muted-foreground text-center truncate">
            {formatReleaseDate(item.releaseDate)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default async function UpcomingPage() {
  const session = await auth();
  const { comingSoon, justReleased } = await getUpcomingWatchlistItems(
    session!.user.id,
  );

  const isEmpty = comingSoon.length === 0 && justReleased.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
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
              <h3 className="text-base font-semibold mb-3">
                Coming Soon{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {comingSoon.length}
                </span>
              </h3>
              <PosterGrid items={comingSoon} />
            </section>
          )}

          {justReleased.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-3">
                Just Released{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  {justReleased.length}
                </span>
              </h3>
              <PosterGrid items={justReleased} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
