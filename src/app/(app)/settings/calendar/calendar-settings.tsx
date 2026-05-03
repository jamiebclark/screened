"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CalendarSettings({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerate = () => {
    startTransition(async () => {
      const res = await fetch("/api/calendar/token", { method: "POST" });
      const data = await res.json();
      setUrl(data.url);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Calendar Feed
          </CardTitle>
          <CardDescription>
            Subscribe to release dates for your watchlist in Google Calendar,
            Apple Calendar, or any app that supports iCal feeds. The feed
            updates automatically as your watchlist changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Feed URL</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={url}
                className="font-mono text-xs"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button variant="outline" size="icon" onClick={copy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">How to subscribe</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>Google Calendar:</strong> Other calendars → From URL →
                paste the feed URL
              </li>
              <li>
                <strong>Apple Calendar:</strong> File → New Calendar
                Subscription → paste the feed URL
              </li>
              <li>
                <strong>Outlook:</strong> Add calendar → Subscribe from web →
                paste the feed URL
              </li>
            </ul>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Regenerating creates a new URL and invalidates the old one. Any
              existing calendar subscriptions will stop updating.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={regenerate}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Regenerate URL
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
