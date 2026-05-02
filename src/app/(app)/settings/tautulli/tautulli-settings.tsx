"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  RefreshCw,
  Unlink,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TautulliSettingsProps {
  connection: {
    tautulliUrl: string;
    tautulliUsername: string | null;
    lastSyncedAt: Date | null;
  } | null;
}

interface SyncResult {
  synced: number;
  skipped: number;
  tvShows: number;
  episodes: number;
  episodesSkipped: number;
}

export function TautulliSettings({
  connection: initialConnection,
}: TautulliSettingsProps) {
  const router = useRouter();
  const [connection, setConnection] = useState(initialConnection);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLink = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const url = (form.get("url") as string).trim();
    const apiKey = (form.get("apiKey") as string).trim();
    const username = (form.get("username") as string).trim();

    setError(null);
    setLinking(true);
    try {
      const res = await fetch("/api/tautulli/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", url, apiKey, username }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to connect.");
      } else {
        setConnection({
          tautulliUrl: url,
          tautulliUsername: username || null,
          lastSyncedAt: null,
        });
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLinking(false);
    }
  };

  const unlink = () => {
    startTransition(async () => {
      await fetch("/api/tautulli/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      setConnection(null);
      setSyncResult(null);
      router.refresh();
    });
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch("/api/tautulli/sync", { method: "POST" });
      const data = (await res.json()) as SyncResult & { error?: string };
      if (res.ok) {
        setSyncResult(data);
        router.refresh();
      } else {
        setError(data.error ?? "Sync failed");
      }
    } catch {
      setError("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {syncResult && (
        <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400 space-y-0.5">
          <p className="font-medium">Sync complete</p>
          <p>
            {syncResult.synced} movie{syncResult.synced !== 1 ? "s" : ""} synced
            {syncResult.tvShows > 0 &&
              ` · ${syncResult.episodes} episodes across ${syncResult.tvShows} show${syncResult.tvShows !== 1 ? "s" : ""}`}
            {syncResult.skipped > 0 &&
              ` · ${syncResult.skipped} could not be matched`}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-400" />
            Tautulli Connection
          </CardTitle>
          <CardDescription>
            Connect your Tautulli instance to sync watch history with precise
            session timestamps and per-play data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {connection.tautulliUrl}
                  </p>
                  {connection.tautulliUsername && (
                    <p className="text-xs text-muted-foreground">
                      Filtering for user: {connection.tautulliUsername}
                    </p>
                  )}
                  {connection.lastSyncedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Last synced:{" "}
                      {new Date(connection.lastSyncedAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Never synced — click Sync now to import your history.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={syncNow} disabled={syncing} size="sm">
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {syncing ? "Syncing..." : "Sync now"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={unlink}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Syncs your completed plays from Tautulli history. Runs
                automatically every few hours alongside Plex sync.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLink} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your Tautulli URL and API key. Find your API key in
                Tautulli → Settings → Web Interface.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tautulli-url">Tautulli URL</Label>
                  <Input
                    id="tautulli-url"
                    name="url"
                    type="url"
                    required
                    placeholder="http://localhost:8181"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tautulli-api-key">API key</Label>
                  <Input
                    id="tautulli-api-key"
                    name="apiKey"
                    type="password"
                    required
                    placeholder="Your Tautulli API key"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tautulli-username">
                    Plex username{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional, recommended for shared servers)
                    </span>
                  </Label>
                  <Input
                    id="tautulli-username"
                    name="username"
                    type="text"
                    placeholder="your-plex-username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </div>
              <Button type="submit" disabled={linking}>
                {linking && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect
              </Button>
              <p className="text-xs text-muted-foreground">
                Tautulli must be reachable from this server. Local-only
                instances won&apos;t work unless Screened is also self-hosted on
                the same network.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
