import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Clapperboard } from "lucide-react";
import { getReleasesFromDate } from "@/lib/releases-queries";
import { ReleasesFeed } from "./releases-feed";

export const metadata: Metadata = { title: "Releases" };

export default async function ReleasesPage() {
  const session = await auth();

  const now = new Date();
  const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const { items, hasMore } = await getReleasesFromDate(
    fromDate,
    1,
    session?.user?.id,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Releases</h1>
          <p className="text-sm text-muted-foreground">
            Upcoming movies sorted by release date
          </p>
        </div>
      </div>

      <ReleasesFeed
        initialItems={items}
        initialHasMore={hasMore}
        fromDate={fromDate}
      />
    </div>
  );
}
