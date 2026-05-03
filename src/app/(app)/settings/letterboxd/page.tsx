import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LetterboxdSettings } from "./letterboxd-settings";

export const metadata: Metadata = { title: "Letterboxd" };

export default async function LetterboxdSettingsPage() {
  const session = await auth();

  const connection = await prisma.letterboxdConnection.findUnique({
    where: { userId: session!.user.id },
    select: {
      letterboxdUsername: true,
      lastSyncedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Letterboxd</h1>
      <p className="text-muted-foreground mb-8">
        Sync your Letterboxd diary to automatically track your watch history.
      </p>
      <LetterboxdSettings connection={connection} />
    </div>
  );
}
