"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Unlink,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { siJellyfin } from "simple-icons";
import { SimpleBrandIcon } from "@/components/simple-brand-icon";
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

interface JellyfinSettingsProps {
  connection: {
    serverUrl: string;
    jellyfinUsername: string;
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

export function JellyfinSettings({
  connection: initialConnection,
}: JellyfinSettingsProps) {
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
    const serverUrl = (form.get("serverUrl") as string).trim();
    const apiKey = (form.get("apiKey") as string).trim();

    setError(null);
    setLinking(true);
    try {
      const res = await fetch("/api/jellyfin/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", serverUrl, apiKey }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to connect.");
      } else {
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
      await fetch("/api/jellyfin/link", {
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
      const res = await fetch("/api/jellyfin/sync", { method: "POST" });
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
            <SimpleBrandIcon
              icon={siJellyfin}
              className="h-5 w-5 text-[#00A4DC]"
            />
            Jellyfin Connection
          </CardTitle>
          <CardDescription>
            Connect your Jellyfin server to sync movies and episodes you have
            watched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {connection.jellyfinUsername}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connection.serverUrl}
                  </p>
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
                Syncs your played movies and episodes from Jellyfin. Runs
                automatically alongside other sync jobs.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLink} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your Jellyfin server URL and an API key. Generate an API
                key in Jellyfin → Dashboard → API Keys.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="jellyfin-url">Server URL</Label>
                  <Input
                    id="jellyfin-url"
                    name="serverUrl"
                    type="url"
                    required
                    placeholder="http://localhost:8096"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jellyfin-api-key">API key</Label>
                  <Input
                    id="jellyfin-api-key"
                    name="apiKey"
                    type="password"
                    required
                    placeholder="Your Jellyfin API key"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </div>
              <Button type="submit" disabled={linking}>
                {linking && <Loader2 className="h-4 w-4 animate-spin" />}
                Connect
              </Button>
              <p className="text-xs text-muted-foreground">
                Jellyfin must be reachable from this server. Use a user-scoped
                API key to import only your own watch history.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
