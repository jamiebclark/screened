"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LetterboxdSettings } from "../settings/letterboxd/letterboxd-settings";
import { PlexSettings } from "../settings/plex/plex-settings";

type PlexConnection = {
  plexUsername: string | null;
  lastSyncedAt: Date | null;
  plexServerId: string | null;
} | null;

type LetterboxdConnection = {
  letterboxdUsername: string;
  lastSyncedAt: Date | null;
} | null;

interface OnboardingClientProps {
  plexConnection: PlexConnection;
  letterboxdConnection: LetterboxdConnection;
}

export function OnboardingClient({
  plexConnection,
  letterboxdConnection,
}: OnboardingClientProps) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeOnboarding = async () => {
    setError(null);
    setFinishing(true);
    try {
      const res = await fetch("/api/user/onboarding/complete", {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not continue.");
        setFinishing(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">1. Plex</h2>
        <PlexSettings
          connection={plexConnection}
          returnPathAfterPin="/onboarding"
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">2. Letterboxd</h2>
        <LetterboxdSettings connection={letterboxdConnection} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          onClick={completeOnboarding}
          disabled={finishing}
        >
          {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
          Skip for now
        </Button>
        <Button type="button" onClick={completeOnboarding} disabled={finishing}>
          {finishing && <Loader2 className="h-4 w-4 animate-spin" />}
          Continue to Screened
        </Button>
      </div>
    </div>
  );
}
