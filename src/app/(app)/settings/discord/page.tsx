import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DiscordSettings } from "./discord-settings";
import { discordFeatures } from "@/lib/discord";

export const metadata = { title: "Discord Settings" };

export default async function DiscordSettingsPage() {
  const session = await auth();
  const features = discordFeatures();

  const connection = features.oauth
    ? await prisma.discordConnection.findUnique({
        where: { userId: session!.user.id },
        select: {
          discordUsername: true,
          dmEnabled: true,
          createdAt: true,
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Discord</h1>
      <p className="text-muted-foreground mb-8">
        Connect Discord for notifications and slash commands.
      </p>
      <DiscordSettings connection={connection} features={features} />
    </div>
  );
}
