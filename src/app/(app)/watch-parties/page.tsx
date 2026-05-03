import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { listWatchPartiesForUser } from "@/lib/watch-party";
import { getRepoDocumentationLinks } from "@/lib/app-release";
import { Button } from "@/components/ui/button";
import { WatchPartiesList } from "./watch-parties-list";

export const metadata: Metadata = { title: "Watch Parties" };

export default async function WatchPartiesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [{ hosted, invited }, { watchPartiesUrl }] = await Promise.all([
    listWatchPartiesForUser(userId),
    getRepoDocumentationLinks(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold">Watch Parties</h1>
          <p className="text-sm text-muted-foreground max-w-prose">
            Schedule a movie or TV show to watch with friends. Invite people
            from your network, track RSVPs, and download a calendar invite — all
            in one place.{" "}
            {watchPartiesUrl && (
              <a
                href={watchPartiesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-2 whitespace-nowrap"
              >
                Learn more
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </a>
            )}
          </p>
        </div>
        <Button asChild className="shrink-0 gap-1.5">
          <Link href="/search">
            <Search className="h-4 w-4" />
            Find something to watch
          </Link>
        </Button>
      </div>
      <WatchPartiesList
        hosted={hosted}
        invited={invited}
        currentUserId={userId}
      />
    </div>
  );
}
