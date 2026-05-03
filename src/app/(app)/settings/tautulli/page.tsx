import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TautulliSettings } from "./tautulli-settings";

export const metadata = { title: "Tautulli" };

export default async function TautulliSettingsPage() {
  const session = await auth();

  const connection = await prisma.tautulliConnection.findUnique({
    where: { userId: session!.user.id },
    select: {
      tautulliUrl: true,
      tautulliUsername: true,
      lastSyncedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Tautulli</h1>
      <p className="text-muted-foreground mb-8">
        Connect Tautulli for richer watch history — precise session timestamps
        and per-session play data from your Plex server.
      </p>
      <TautulliSettings connection={connection} />
    </div>
  );
}
