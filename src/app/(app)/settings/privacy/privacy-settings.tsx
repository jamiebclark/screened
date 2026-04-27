"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileContentVisibility } from "@/generated/prisma";

type V = ProfileContentVisibility;

const labels: Record<V, string> = {
  PUBLIC: "All Screened users",
  FRIENDS: "Friends only",
};

interface PrivacySettingsProps {
  initial: { watchlistVisibility: V; watchHistoryVisibility: V };
}

/** Remount when server-sourced visibility values change (e.g. after refresh) without a prop-sync effect. */
export function PrivacySettings({ initial }: PrivacySettingsProps) {
  return (
    <PrivacySettingsForm
      key={`${initial.watchlistVisibility}-${initial.watchHistoryVisibility}`}
      initial={initial}
    />
  );
}

function PrivacySettingsForm({ initial }: PrivacySettingsProps) {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<V>(initial.watchlistVisibility);
  const [watchHistory, setWatchHistory] = useState<V>(
    initial.watchHistoryVisibility,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed =
    watchlist !== initial.watchlistVisibility ||
    watchHistory !== initial.watchHistoryVisibility;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!changed) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/user/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watchlistVisibility: watchlist,
          watchHistoryVisibility: watchHistory,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not save");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What others can see on your profile</CardTitle>
          <CardDescription>
            Screened is sign-in only. “All Screened users” means anyone on the
            app; “Friends only” means people you have accepted on the Friends
            page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="watchlist-vis">
              Watchlist (titles you plan to watch)
            </Label>
            <Select
              value={watchlist}
              onValueChange={(v) => setWatchlist(v as V)}
            >
              <SelectTrigger id="watchlist-vis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(labels) as V[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {labels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="history-vis">
              Watched and watching (your activity on your profile)
            </Label>
            <Select
              value={watchHistory}
              onValueChange={(v) => setWatchHistory(v as V)}
            >
              <SelectTrigger id="history-vis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(labels) as V[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {labels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={!changed || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
