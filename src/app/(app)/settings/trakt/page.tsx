import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTraktConfigured } from "@/lib/trakt";
import { TraktSettings } from "./trakt-settings";

export const metadata = { title: "Trakt | Screened" };

export default async function TraktSettingsPage() {
  if (!isTraktConfigured()) notFound();

  const session = await auth();

  const connection = await prisma.traktConnection.findUnique({
    where: { userId: session!.user.id },
    select: { traktUsername: true, lastSyncedAt: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Trakt</h1>
      <p className="text-muted-foreground mb-8">
        Import your full watch history from Trakt, including ratings and dates.
      </p>
      <TraktSettings connection={connection} />
    </div>
  );
}
