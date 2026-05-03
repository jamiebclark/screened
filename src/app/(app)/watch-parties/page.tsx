import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { listWatchPartiesForUser } from "@/lib/watch-party";
import { WatchPartiesList } from "./watch-parties-list";

export const metadata: Metadata = { title: "Watch Parties" };

export default async function WatchPartiesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const { hosted, invited } = await listWatchPartiesForUser(userId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      <h1 className="text-2xl font-bold">Watch Parties</h1>
      <WatchPartiesList
        hosted={hosted}
        invited={invited}
        currentUserId={userId}
      />
    </div>
  );
}
