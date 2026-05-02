import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OverseerrSettings } from "./overseerr-settings";

export const metadata = { title: "Overseerr | Screened" };

export default async function OverseerrSettingsPage() {
  const session = await auth();

  const connection = await prisma.overseerrConnection.findUnique({
    where: { userId: session!.user.id },
    select: { serverUrl: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Overseerr</h1>
      <p className="text-muted-foreground mb-8">
        When you add a title to your watchlist, Screened will automatically
        submit a download request to your Overseerr instance.
      </p>
      <OverseerrSettings connection={connection} />
    </div>
  );
}
