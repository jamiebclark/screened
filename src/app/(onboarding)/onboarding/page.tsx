import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { isTraktConfigured } from "@/lib/trakt";
import { discordFeatures } from "@/lib/discord";
import { OnboardingClient } from "./onboarding-client";
import { Skeleton } from "@/components/ui/skeleton";
import { safeCallbackPath } from "@/lib/safe-callback-path";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!session?.user?.id) {
    redirect("/login");
  }
  const callbackUrl = safeCallbackPath(params.callbackUrl ?? null);

  const traktConfigured = isTraktConfigured();
  const features = discordFeatures();

  const [plex, letterboxd, jellyfin, tautulli, trakt, discord] =
    await Promise.all([
      prisma.plexConnection.findUnique({
        where: { userId: session.user.id },
        select: { plexUsername: true, lastSyncedAt: true, plexServerId: true },
      }),
      prisma.letterboxdConnection.findUnique({
        where: { userId: session.user.id },
        select: { letterboxdUsername: true, lastSyncedAt: true },
      }),
      prisma.jellyfinConnection.findUnique({
        where: { userId: session.user.id },
        select: { serverUrl: true, jellyfinUsername: true, lastSyncedAt: true },
      }),
      prisma.tautulliConnection.findUnique({
        where: { userId: session.user.id },
        select: {
          tautulliUrl: true,
          tautulliUsername: true,
          lastSyncedAt: true,
        },
      }),
      traktConfigured
        ? prisma.traktConnection.findUnique({
            where: { userId: session.user.id },
            select: { traktUsername: true, lastSyncedAt: true },
          })
        : null,
      features.oauth
        ? prisma.discordConnection.findUnique({
            where: { userId: session.user.id },
            select: { discordUsername: true, dmEnabled: true, createdAt: true },
          })
        : null,
    ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome to Screened</h1>
        <p className="text-muted-foreground mt-1">
          Connect your media services to import watch history, or skip and do
          this later in settings.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        }
      >
        <OnboardingClient
          plexConnection={plex}
          letterboxdConnection={letterboxd}
          jellyfinConnection={jellyfin}
          tautulliConnection={tautulli}
          traktConnection={trakt}
          traktConfigured={traktConfigured}
          discordConnection={discord}
          discordFeatures={features}
          callbackUrl={callbackUrl}
        />
      </Suspense>
    </div>
  );
}
