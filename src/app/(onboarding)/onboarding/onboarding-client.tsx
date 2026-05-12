"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LetterboxdSettings } from "@/app/(app)/settings/letterboxd/letterboxd-settings";
import { PlexSettings } from "@/app/(app)/settings/plex/plex-settings";
import { JellyfinSettings } from "@/app/(app)/settings/jellyfin/jellyfin-settings";
import { TautulliSettings } from "@/app/(app)/settings/tautulli/tautulli-settings";
import { TraktSettings } from "@/app/(app)/settings/trakt/trakt-settings";
import { DiscordSettings } from "@/app/(app)/settings/discord/discord-settings";

type PlexConnection = {
  plexUsername: string | null;
  lastSyncedAt: Date | null;
  plexServerId: string | null;
} | null;

type LetterboxdConnection = {
  letterboxdUsername: string;
  lastSyncedAt: Date | null;
} | null;

type JellyfinConnection = {
  serverUrl: string;
  jellyfinUsername: string;
  lastSyncedAt: Date | null;
} | null;

type TautulliConnection = {
  tautulliUrl: string;
  tautulliUsername: string | null;
  lastSyncedAt: Date | null;
} | null;

type TraktConnection = {
  traktUsername: string;
  lastSyncedAt: Date | null;
} | null;

type DiscordConnection = {
  discordUsername: string;
  dmEnabled: boolean;
  createdAt: Date;
} | null;

interface OnboardingClientProps {
  plexConnection: PlexConnection;
  letterboxdConnection: LetterboxdConnection;
  jellyfinConnection: JellyfinConnection;
  tautulliConnection: TautulliConnection;
  traktConnection: TraktConnection;
  traktConfigured: boolean;
  discordConnection: DiscordConnection;
  discordFeatures: { bot: boolean; oauth: boolean };
  callbackUrl?: string;
}

export function OnboardingClient({
  plexConnection,
  letterboxdConnection,
  jellyfinConnection,
  tautulliConnection,
  traktConnection,
  traktConfigured,
  discordConnection,
  discordFeatures,
  callbackUrl = "/",
}: OnboardingClientProps) {
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);

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
      router.push(callbackUrl);
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
        <h2 className="text-lg font-semibold mb-3">2. Jellyfin</h2>
        <JellyfinSettings connection={jellyfinConnection} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">3. Letterboxd</h2>
        <LetterboxdSettings connection={letterboxdConnection} />
      </section>

      <div className="rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setOtherOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-left"
        >
          Other integrations
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              otherOpen && "rotate-180",
            )}
          />
        </button>

        {otherOpen && (
          <div className="space-y-8 border-t border-border px-4 pt-6 pb-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">Tautulli</h2>
              <TautulliSettings connection={tautulliConnection} />
            </section>

            {traktConfigured && (
              <section>
                <h2 className="text-lg font-semibold mb-3">Trakt</h2>
                <TraktSettings connection={traktConnection} />
              </section>
            )}

            <section>
              <h2 className="text-lg font-semibold mb-3">Discord</h2>
              <DiscordSettings
                connection={discordConnection}
                features={discordFeatures}
              />
            </section>
          </div>
        )}
      </div>

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
