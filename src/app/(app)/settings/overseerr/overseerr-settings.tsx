"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
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

interface OverseerrSettingsProps {
  connection: { serverUrl: string } | null;
}

export function OverseerrSettings({
  connection: initialConnection,
}: OverseerrSettingsProps) {
  const router = useRouter();
  const [connection, setConnection] = useState(initialConnection);
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
      const res = await fetch("/api/overseerr/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link", serverUrl, apiKey }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to connect.");
      } else {
        setConnection({ serverUrl });
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
      await fetch("/api/overseerr/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      setConnection(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-[#F97316]" />
            Overseerr Connection
          </CardTitle>
          <CardDescription>
            Connect Overseerr or Jellyseerr to auto-request downloads when you
            add movies or shows to your watchlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{connection.serverUrl}</p>
                  <p className="text-xs text-muted-foreground">
                    Requests will be submitted automatically when you add titles
                    to your watchlist.
                  </p>
                </div>
              </div>

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
          ) : (
            <form onSubmit={handleLink} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your Overseerr or Jellyseerr URL and API key. Find your
                API key in Overseerr → Settings → General.
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="overseerr-url">Server URL</Label>
                  <Input
                    id="overseerr-url"
                    name="serverUrl"
                    type="url"
                    required
                    placeholder="http://localhost:5055"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="overseerr-api-key">API key</Label>
                  <Input
                    id="overseerr-api-key"
                    name="apiKey"
                    type="password"
                    required
                    placeholder="Your Overseerr API key"
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
                Overseerr must be reachable from this server. Requests are
                submitted with your API key — ensure it has request permissions.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
