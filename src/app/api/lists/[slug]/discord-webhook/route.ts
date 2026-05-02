import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DISCORD_API = "https://discord.com/api/v10";

type Params = { params: Promise<{ slug: string }> };

async function botPost(path: string, body: unknown) {
  return fetch(`${DISCORD_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function botDelete(path: string) {
  return fetch(`${DISCORD_API}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
}

// POST — create a managed webhook in the given channel and store it on the list
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DISCORD_BOT_TOKEN) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 503 });
  }

  const { slug } = await params;
  const body = (await req.json()) as {
    channelId?: string;
    channelName?: string;
    guildName?: string;
  };

  if (!body.channelId) {
    return NextResponse.json({ error: "channelId required" }, { status: 400 });
  }

  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete any existing webhook before creating a new one
  if (list.discordWebhookId) {
    await botDelete(`/webhooks/${list.discordWebhookId}`).catch(() => null);
  }

  const whRes = await botPost(`/channels/${body.channelId}/webhooks`, {
    name: "Screened",
  });

  if (!whRes.ok) {
    const text = await whRes.text();
    console.error("[discord] create webhook failed", whRes.status, text);
    if (whRes.status === 403) {
      return NextResponse.json(
        { error: "Missing Manage Webhooks permission in that channel." },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 502 });
  }

  const webhook = (await whRes.json()) as { id: string; token: string; url: string };

  await prisma.list.update({
    where: { slug },
    data: {
      discordWebhookUrl: webhook.url,
      discordWebhookId: webhook.id,
      discordChannelName: body.channelName ?? null,
      discordGuildName: body.guildName ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    channelName: body.channelName,
    guildName: body.guildName,
  });
}

// DELETE — remove the webhook from Discord and clear the list
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (list.discordWebhookId) {
    await botDelete(`/webhooks/${list.discordWebhookId}`).catch(() => null);
  }

  await prisma.list.update({
    where: { slug },
    data: {
      discordWebhookUrl: null,
      discordWebhookId: null,
      discordChannelName: null,
      discordGuildName: null,
    },
  });

  return NextResponse.json({ ok: true });
}
