"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Tv2,
  RefreshCw,
  Unlink,
  ExternalLink,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PlexSettingsProps {
  connection: {
    plexUsername: string | null;
    lastSyncedAt: Date | null;
    plexServerId: string | null;
  } | null;
  /** After Plex PIN auth, navigate here (default: settings plex). Use `/onboarding` on the first-login wizard. */
  returnPathAfterPin?: string;
}

export function PlexSettings({
  connection: initialConnection,
  returnPathAfterPin = "/settings/plex",
}: PlexSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pinId = searchParams.get("pinId");

  const [connection, setConnection] = useState(initialConnection);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    skipped: number;
    tvShows: number;
    episodes: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(!!pinId);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!pinId) return;

    const verify = async () => {
      try {
        const res = await fetch("/api/plex/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify-pin",
            pinId: parseInt(pinId),
          }),
        });
        const data = (await res.json()) as {
          verified?: boolean;
          username?: string;
          error?: string;
        };
        if (data.verified) {
          router.replace(returnPathAfterPin);
          router.refresh();
        } else {
          setError("Plex authentication was not completed. Please try again.");
        }
      } catch {
        setError("Failed to verify Plex authentication.");
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [pinId, returnPathAfterPin, router]);

  const connectPlex = async () => {
    setError(null);
    try {
      const res = await fetch("/api/plex/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-pin",
          returnPath: returnPathAfterPin,
        }),
      });
      const data = (await res.json()) as { authUrl?: string; error?: string };
      if (data.authUrl) {
        window.open(data.authUrl, "_blank", "width=800,height=600");
      }
    } catch {
      setError("Failed to initiate Plex authentication.");
    }
  };

  const unlinkPlex = () => {
    startTransition(async () => {
      await fetch("/api/plex/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      setConnection(null);
      router.refresh();
    });
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch("/api/plex/sync", { method: "POST" });
      const data = (await res.json()) as {
        synced?: number;
        skipped?: number;
        tvShows?: number;
        episodes?: number;
        error?: string;
      };
      if (res.ok) {
        setSyncResult({
          synced: data.synced ?? 0,
          skipped: data.skipped ?? 0,
          tvShows: data.tvShows ?? 0,
          episodes: data.episodes ?? 0,
        });
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

  if (verifying) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">
            Verifying Plex authentication...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {syncResult && (
        <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400 space-y-0.5">
          <p className="font-medium">Sync complete</p>
          <p>
            {syncResult.synced} movie{syncResult.synced !== 1 ? "s" : ""}{" "}
            watched
            {" · "}
            {syncResult.episodes} TV episode
            {syncResult.episodes !== 1 ? "s" : ""} across {syncResult.tvShows}{" "}
            show{syncResult.tvShows !== 1 ? "s" : ""} imported
            {syncResult.synced === 0 && syncResult.episodes === 0
              ? " — nothing new"
              : ""}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv2 className="h-5 w-5 text-[#E5A00D]" />
            Plex Account
          </CardTitle>
          <CardDescription>
            Connect Plex to automatically mark movies as watched based on your
            play history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Connected as @{connection.plexUsername}
                  </p>
                  {connection.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last synced:{" "}
                      {new Date(connection.lastSyncedAt).toLocaleString()}
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
                  onClick={unlinkPlex}
                  disabled={isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Unlink className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  Sync imports your Plex movie and TV episode watch history.
                  Movies are marked as &quot;Watched&quot;; TV shows are set to
                  &quot;Watching&quot; with your episode progress tracked.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No Plex account connected. Click below to authenticate with
                Plex. A new window will open — sign in and authorize the app,
                then return here.
              </p>
              <Button onClick={connectPlex}>
                <ExternalLink className="h-4 w-4" />
                Connect Plex
              </Button>

              <p className="text-xs text-muted-foreground">
                After authorizing in Plex, return to this page to complete the
                connection.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
