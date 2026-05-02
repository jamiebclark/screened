import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JellyfinSettings } from "./jellyfin-settings";

export const metadata = { title: "Jellyfin | Screened" };

export default async function JellyfinSettingsPage() {
  const session = await auth();

  const connection = await prisma.jellyfinConnection.findUnique({
    where: { userId: session!.user.id },
    select: {
      serverUrl: true,
      jellyfinUsername: true,
      lastSyncedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Jellyfin</h1>
      <p className="text-muted-foreground mb-8">
        Connect your Jellyfin server to sync watch history automatically.
      </p>
      <JellyfinSettings connection={connection} />
    </div>
  );
}
