import { NextRequest, NextResponse } from "next/server";
import { verifyDiscordSignature } from "@/lib/discord";
import { prisma } from "@/lib/prisma";

const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

const RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

function ephemeral(content: string) {
  return NextResponse.json({
    type: RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: 64 }, // 64 = ephemeral
  });
}

function channel(content: string, embeds?: unknown[]) {
  return NextResponse.json({
    type: RESPONSE_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, embeds },
  });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("X-Signature-Ed25519") ?? "";
  const timestamp = req.headers.get("X-Signature-Timestamp") ?? "";
  const rawBody = await req.text();

  const valid = await verifyDiscordSignature(rawBody, signature, timestamp);
  if (!valid) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as {
    type: number;
    data?: { name: string; options?: { name: string; value: string }[] };
    member?: { user?: { id: string } };
    user?: { id: string };
  };

  if (body.type === INTERACTION_TYPE.PING) {
    return NextResponse.json({ type: RESPONSE_TYPE.PONG });
  }

  if (body.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    const commandName = body.data?.name;
    const discordUserId = body.member?.user?.id ?? body.user?.id;

    if (commandName === "link") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return ephemeral(
        `Connect your Screened account to enable personalised commands: ${appUrl}/settings/discord`,
      );
    }

    // All other commands require a linked account
    if (!discordUserId) {
      return ephemeral("Could not identify your Discord user.");
    }

    const connection = await prisma.discordConnection.findUnique({
      where: { discordUserId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!connection) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      return ephemeral(
        `Your Discord account isn't linked to Screened yet. Visit ${appUrl}/settings/discord to connect.`,
      );
    }

    if (commandName === "whats-new") {
      const userId = connection.user.id;
      const friendships = await prisma.friendship.findMany({
        where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
        select: { userLowId: true, userHighId: true },
      });
      const friendIds = friendships.map((f) =>
        f.userLowId === userId ? f.userHighId : f.userLowId,
      );

      if (friendIds.length === 0) {
        return ephemeral("You have no friends on Screened yet. Add some from the app!");
      }

      const entries = await prisma.watchEntry.findMany({
        where: { userId: { in: friendIds } },
        include: {
          mediaItem: { select: { title: true, year: true, type: true } },
          user: { select: { name: true } },
        },
        orderBy: { watchedAt: "desc" },
        take: 5,
      });

      if (entries.length === 0) {
        return ephemeral("No recent activity from your friends.");
      }

      const lines = entries.map((e) => {
        const title = e.mediaItem.year
          ? `${e.mediaItem.title} (${e.mediaItem.year})`
          : e.mediaItem.title;
        return `**${e.user.name}** watched ${title}`;
      });

      return channel(`**What your friends watched recently:**\n${lines.join("\n")}`);
    }

    if (commandName === "pick") {
      const userId = connection.user.id;
      const watchlist = await prisma.userMediaStatus.findMany({
        where: { userId, status: "WATCHLIST" },
        include: { mediaItem: { select: { title: true, year: true, tmdbId: true, type: true } } },
      });

      if (watchlist.length === 0) {
        return ephemeral("Your watchlist is empty. Add some titles from the app!");
      }

      const pick = watchlist[Math.floor(Math.random() * watchlist.length)];
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const path = pick.mediaItem.type === "MOVIE" ? "movies" : "tv";
      const title = pick.mediaItem.year
        ? `${pick.mediaItem.title} (${pick.mediaItem.year})`
        : pick.mediaItem.title;

      return channel(
        `🎬 **Tonight's pick:** ${title}\n${appUrl}/${path}/${pick.mediaItem.tmdbId}`,
      );
    }

    return ephemeral(`Unknown command: ${commandName}`);
  }

  return new NextResponse("Unknown interaction type", { status: 400 });
}
