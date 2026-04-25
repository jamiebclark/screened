import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlexSettings } from "./plex-settings";

export default async function PlexSettingsPage() {
  const session = await auth();

  const connection = await prisma.plexConnection.findUnique({
    where: { userId: session!.user.id },
    select: {
      plexUsername: true,
      lastSyncedAt: true,
      plexServerId: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Plex Settings</h1>
      <p className="text-muted-foreground mb-8">
        Connect your Plex account to automatically sync your watch history.
      </p>
      <PlexSettings connection={connection} />
    </div>
  );
}
