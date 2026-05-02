import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const DISCORD_API = "https://discord.com/api/v10";

type DiscordChannel = {
  id: string;
  type: number;
  name: string | null;
  position?: number;
};

type DiscordGuild = {
  id: string;
  name: string;
};

export type DiscordChannelGroup = {
  guildId: string;
  guildName: string;
  channels: { id: string; name: string }[];
};

async function botGet(path: string) {
  return fetch(`${DISCORD_API}${path}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    next: { revalidate: 60 },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  const guildsRes = await botGet("/users/@me/guilds");
  if (!guildsRes.ok) {
    console.error("[discord] failed to fetch guilds", guildsRes.status);
    return NextResponse.json(
      { error: "Failed to fetch Discord servers" },
      { status: 502 },
    );
  }

  const guilds = (await guildsRes.json()) as DiscordGuild[];

  const groups: DiscordChannelGroup[] = [];

  await Promise.all(
    guilds.map(async (guild) => {
      const chRes = await botGet(`/guilds/${guild.id}/channels`);
      if (!chRes.ok) return;
      const channels = (await chRes.json()) as DiscordChannel[];
      // Type 0 = GUILD_TEXT
      const textChannels = channels
        .filter((c) => c.type === 0 && c.name)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((c) => ({ id: c.id, name: c.name! }));
      if (textChannels.length > 0) {
        groups.push({
          guildId: guild.id,
          guildName: guild.name,
          channels: textChannels,
        });
      }
    }),
  );

  groups.sort((a, b) => a.guildName.localeCompare(b.guildName));

  return NextResponse.json({ groups });
}
