"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Film, RefreshCw, Unlink, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LetterboxdSettingsProps {
  connection: {
    letterboxdUsername: string;
    lastSyncedAt: Date | null;
  } | null;
}

interface SyncResult {
  synced: number;
  skipped: number;
  alreadyWatched: number;
}

export function LetterboxdSettings({ connection: initialConnection }: LetterboxdSettingsProps) {
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
    const username = (form.get("username") as string).trim();

    setError(null);
    setLinking(true);
    try {
      const res = await fetch("/api/letterboxd/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", username }),
      });
      const data = (await res.json()) as { ok?: boolean; username?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to connect.");
      } else {
        setConnection({ letterboxdUsername: data.username!, lastSyncedAt: null });
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
      await fetch("/api/letterboxd/link", {
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
      const res = await fetch("/api/letterboxd/sync", { method: "POST" });
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
            {syncResult.synced} film{syncResult.synced !== 1 ? "s" : ""} newly marked as watched
            {syncResult.alreadyWatched > 0 && ` · ${syncResult.alreadyWatched} already tracked`}
            {syncResult.skipped > 0 && ` · ${syncResult.skipped} could not be matched`}
            {syncResult.synced === 0 && syncResult.alreadyWatched > 0 ? " — nothing new" : ""}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-[#00C030]" />
            Letterboxd Account
          </CardTitle>
          <CardDescription>
            Connect your Letterboxd account to automatically import your diary and mark films as watched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Connected as @{connection.letterboxdUsername}</p>
                  {connection.lastSyncedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Never synced — click Sync now to import your history.</p>
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
                Syncs your most recent Letterboxd diary entries, including watch dates and star ratings. Runs automatically every few hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLink} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your Letterboxd username to connect your diary. Your profile must be public.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="letterboxd-username">Letterboxd username</Label>
                <div className="flex gap-2">
                  <Input
                    id="letterboxd-username"
                    name="username"
                    type="text"
                    required
                    placeholder="username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <Button type="submit" disabled={linking}>
                    {linking && <Loader2 className="h-4 w-4 animate-spin" />}
                    Connect
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your Letterboxd profile must be public for syncing to work.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
