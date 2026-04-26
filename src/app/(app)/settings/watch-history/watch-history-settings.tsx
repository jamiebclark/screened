"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WatchHistoryResetScope, WatchImportCounts } from "@/lib/watch-history-scopes";
import { PLEX_EPISODES_SCOPE } from "@/lib/watch-history-scopes";

interface Row {
  scope: WatchHistoryResetScope;
  integration: string;
  library: string;
  count: number;
  resetHint: string;
}

function buildRows(counts: WatchImportCounts): Row[] {
  return [
    {
      scope: "plex_movie",
      integration: "Plex",
      library: "Movies",
      count: counts.plexMovie,
      resetHint: "Removes movie watch entries synced from Plex. Re-sync Plex to import them again.",
    },
    {
      scope: "plex_tv",
      integration: "Plex",
      library: "TV shows",
      count: counts.plexTv,
      resetHint:
        "Removes TV show-level history entries attributed to Plex (if any). Episode checkmarks are managed separately below.",
    },
    {
      scope: "letterboxd",
      integration: "Letterboxd",
      library: "Diary (movies)",
      count: counts.letterboxd,
      resetHint: "Removes watch entries imported from your Letterboxd RSS diary.",
    },
    {
      scope: "manual_movie",
      integration: "This app",
      library: "Movies",
      count: counts.manualMovie,
      resetHint: "Removes movie entries you added manually on title pages.",
    },
    {
      scope: "manual_tv",
      integration: "This app",
      library: "TV shows",
      count: counts.manualTv,
      resetHint: "Removes TV entries you added manually on title pages.",
    },
    {
      scope: "unknown_movie",
      integration: "Earlier data",
      library: "Movies",
      count: counts.unknownMovie,
      resetHint:
        "Entries created before sources were tracked, or from older imports. Safe to clear if dates look wrong.",
    },
    {
      scope: "unknown_tv",
      integration: "Earlier data",
      library: "TV shows",
      count: counts.unknownTv,
      resetHint:
        "Often from legacy migrations. Clearing this fixes bogus “today” TV rows without affecting Plex episode progress.",
    },
  ];
}

interface WatchHistorySettingsProps {
  initialCounts: WatchImportCounts;
}

export function WatchHistorySettings({ initialCounts }: WatchHistorySettingsProps) {
  const router = useRouter();
  const [counts, setCounts] = useState(initialCounts);
  const [pendingScope, setPendingScope] = useState<WatchHistoryResetScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refreshCounts = async () => {
    const res = await fetch("/api/settings/watch-history");
    if (res.ok) {
      const next = (await res.json()) as WatchImportCounts;
      setCounts(next);
    }
  };

  const runReset = (scope: WatchHistoryResetScope) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/watch-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "Something went wrong");
          return;
        }
        setPendingScope(null);
        await refreshCounts();
        router.refresh();
      } catch {
        setError("Request failed");
      }
    });
  };

  const rows = buildRows(counts);
  const pendingRow = pendingScope ? rows.find((r) => r.scope === pendingScope) : null;
  const episodeDialogOpen = pendingScope === PLEX_EPISODES_SCOPE;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Watch history by source</CardTitle>
          <CardDescription>
            Your <span className="text-foreground">Watch History</span> page lists title-level entries. Counts reflect
            how many entries came from each integration. Clearing a row only removes those history lines — it does not
            disconnect Plex or Letterboxd.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Integration</th>
                  <th className="px-3 py-2 font-medium">Library</th>
                  <th className="px-3 py-2 font-medium text-right">Entries</th>
                  <th className="px-3 py-2 font-medium text-right w-[1%]"> </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.scope} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">{row.integration}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.library}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.count}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        disabled={row.count === 0 || isPending}
                        onClick={() => setPendingScope(row.scope)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Clear
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>TV episode progress (Plex)</CardTitle>
          <CardDescription>
            Plex sync stores which episodes you have watched. This is separate from the show-level list on Watch
            History.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{counts.plexEpisodes}</span> watched episode
            records
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive shrink-0"
            disabled={counts.plexEpisodes === 0 || isPending}
            onClick={() => setPendingScope(PLEX_EPISODES_SCOPE)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear all episode progress
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!pendingScope && !episodeDialogOpen} onOpenChange={(o) => !o && setPendingScope(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear this watch history?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This removes{" "}
                  <span className="font-medium text-foreground tabular-nums">{pendingRow?.count ?? 0}</span> entr
                  {(pendingRow?.count ?? 0) !== 1 ? "ies" : "y"} from{" "}
                  <span className="text-foreground">
                    {pendingRow?.integration} · {pendingRow?.library}
                  </span>
                  .
                </p>
                <p>{pendingRow?.resetHint}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPendingScope(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !pendingScope || pendingScope === PLEX_EPISODES_SCOPE}
              onClick={() => pendingScope && pendingScope !== PLEX_EPISODES_SCOPE && runReset(pendingScope)}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clear entries"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={episodeDialogOpen} onOpenChange={(o) => !o && setPendingScope(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all TV episode progress?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This deletes{" "}
                  <span className="font-medium text-foreground tabular-nums">{counts.plexEpisodes}</span> episode
                  records synced from Plex. Your Watch History entries are not removed by this action.
                </p>
                <p>Run a Plex sync again to rebuild episode progress from your server.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPendingScope(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={() => runReset(PLEX_EPISODES_SCOPE)}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clear episode progress"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
