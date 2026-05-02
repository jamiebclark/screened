"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Unlink,
  CheckCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { siTrakt } from "simple-icons";
import { SimpleBrandIcon } from "@/components/simple-brand-icon";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TraktSettingsProps {
  connection: {
    traktUsername: string;
    lastSyncedAt: Date | null;
  } | null;
  configured: boolean;
}

interface SyncResult {
  synced: number;
  skipped: number;
  tvShows: number;
  episodes: number;
  episodesSkipped: number;
}

type LinkState =
  | { stage: "idle" }
  | {
      stage: "pending";
      userCode: string;
      verificationUrl: string;
      deviceCode: string;
    }
  | { stage: "polling" };

export function TraktSettings({
  connection: initialConnection,
  configured,
}: TraktSettingsProps) {
  const router = useRouter();
  const [connection, setConnection] = useState(initialConnection);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LinkState>({ stage: "idle" });
  const [isPending, startTransition] = useTransition();
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const startLink = async () => {
    setError(null);
    setLinkState({ stage: "polling" });
    try {
      const res = await fetch("/api/trakt/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "initiate" }),
      });
      const data = (await res.json()) as {
        device_code?: string;
        user_code?: string;
        verification_url?: string;
        interval?: number;
        error?: string;
      };
      if (!res.ok || !data.device_code) {
        setLinkState({ stage: "idle" });
        setError(data.error ?? "Could not initiate Trakt authorization");
        return;
      }

      setLinkState({
        stage: "pending",
        userCode: data.user_code!,
        verificationUrl: data.verification_url!,
        deviceCode: data.device_code,
      });

      const interval = (data.interval ?? 5) * 1000;
      pollIntervalRef.current = setInterval(async () => {
        const pollRes = await fetch("/api/trakt/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "poll",
            deviceCode: data.device_code,
          }),
        });
        const pollData = (await pollRes.json()) as {
          ok?: boolean;
          username?: string;
          pending?: boolean;
          expired?: boolean;
          error?: string;
        };

        if (pollData.ok) {
          clearInterval(pollIntervalRef.current!);
          setLinkState({ stage: "idle" });
          setConnection({
            traktUsername: pollData.username!,
            lastSyncedAt: null,
          });
          router.refresh();
        } else if (pollData.expired) {
          clearInterval(pollIntervalRef.current!);
          setLinkState({ stage: "idle" });
          setError("Authorization expired. Please try again.");
        } else if (pollData.error) {
          clearInterval(pollIntervalRef.current!);
          setLinkState({ stage: "idle" });
          setError(pollData.error);
        }
      }, interval);
    } catch {
      setLinkState({ stage: "idle" });
      setError("Something went wrong. Please try again.");
    }
  };

  const cancelLink = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setLinkState({ stage: "idle" });
  };

  const unlink = () => {
    startTransition(async () => {
      await fetch("/api/trakt/link", {
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
      const res = await fetch("/api/trakt/sync", { method: "POST" });
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

  if (!configured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SimpleBrandIcon
              icon={siTrakt}
              className="h-5 w-5 text-[#ED1C24]"
            />
            Trakt
          </CardTitle>
          <CardDescription>
            Trakt integration requires server configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              TRAKT_CLIENT_ID
            </code>{" "}
            and{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              TRAKT_CLIENT_SECRET
            </code>{" "}
            to your environment to enable Trakt. Register an app at
            trakt.tv/oauth/applications.
          </p>
        </CardContent>
      </Card>
    );
  }

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
              icon={siTrakt}
              className="h-5 w-5 text-[#ED1C24]"
            />
            Trakt Account
          </CardTitle>
          <CardDescription>
            Connect your Trakt account to import your full watch history,
            including ratings and watch dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {connection.traktUsername}
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
                Imports your full Trakt watch history. Runs automatically
                alongside other sync jobs.
              </p>
            </div>
          ) : linkState.stage === "pending" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Visit the link below and enter the code to authorize Screened.
              </p>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Authorization code
                  </span>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                </div>
                <p className="text-2xl font-mono font-bold tracking-widest">
                  {linkState.userCode}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={linkState.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open {linkState.verificationUrl}
                  </a>
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelLink}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Authorize Screened to access your Trakt watch history. You will
                be given a code to enter on trakt.tv.
              </p>
              <Button
                onClick={startLink}
                disabled={linkState.stage === "polling"}
              >
                {linkState.stage === "polling" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Connect Trakt
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
