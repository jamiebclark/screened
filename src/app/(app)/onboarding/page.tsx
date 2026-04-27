import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [plex, letterboxd] = await Promise.all([
    prisma.plexConnection.findUnique({
      where: { userId: session.user.id },
      select: { plexUsername: true, lastSyncedAt: true, plexServerId: true },
    }),
    prisma.letterboxdConnection.findUnique({
      where: { userId: session.user.id },
      select: { letterboxdUsername: true, lastSyncedAt: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome to Screened</h1>
        <p className="text-muted-foreground mt-1">
          Connect Plex and Letterboxd to import watch history, or skip and do
          this later in settings.
        </p>
      </div>

      <Suspense fallback={null}>
        <OnboardingClient
          plexConnection={plex}
          letterboxdConnection={letterboxd}
        />
      </Suspense>
    </div>
  );
}
