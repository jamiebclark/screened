import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PrivacySettings } from "./privacy-settings";

export const metadata = { title: "Privacy | Settings | Screened" };

export default async function PrivacyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { watchlistVisibility: true, watchHistoryVisibility: true },
  });
  if (!user) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Privacy</h1>
      <p className="text-muted-foreground mb-8">
        Control who can see your watchlist and your watched/watching activity on your public
        profile.
      </p>
      <PrivacySettings
        initial={{
          watchlistVisibility: user.watchlistVisibility,
          watchHistoryVisibility: user.watchHistoryVisibility,
        }}
      />
    </div>
  );
}
