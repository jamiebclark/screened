import { auth } from "@/lib/auth";
import { getWatchImportCounts } from "@/lib/watch-import-stats";
import { WatchHistorySettings } from "./watch-history-settings";

export const metadata = { title: "Watch history & imports | Screened" };

export default async function WatchHistorySettingsPage() {
  const session = await auth();

  const initialCounts = await getWatchImportCounts(session!.user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Watch history & imports</h1>
      <p className="text-muted-foreground mb-8">
        See how many watch history entries came from each integration, and clear
        specific groups without affecting your account or connections.
      </p>
      <WatchHistorySettings initialCounts={initialCounts} />
    </div>
  );
}
