import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PreferencesSettings } from "./preferences-settings";

export const metadata = { title: "Saved Preferences" };

export default async function PreferencesPage() {
  const session = await auth();

  const preferences = await prisma.userPreference.findMany({
    where: { userId: session!.user.id },
    include: {
      mediaItem: {
        select: {
          id: true,
          tmdbId: true,
          title: true,
          poster: true,
          year: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Saved Preferences</h1>
      <p className="text-muted-foreground mb-8">
        These are pre-loaded into the Movie Night Picker whenever you start a
        new session. You can update them there or remove them here.
      </p>
      <PreferencesSettings preferences={preferences} />
    </div>
  );
}
