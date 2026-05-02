const DISCORD_API = "https://discord.com/api/v10";

// Tier detection — checked at call time so env vars can be set after module load
export function discordFeatures() {
  return {
    bot: !!(
      process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_APPLICATION_ID
    ),
    oauth: !!(
      process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ),
  };
}

// Embed colors
const COLOR = {
  watched: 0x5865f2,
  added: 0x57f287,
  picker: 0xeb459e,
} as const;

type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: { url: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  url?: string;
};

// Post a raw webhook payload
async function postWebhook(webhookUrl: string, body: unknown): Promise<void> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(
        "[discord] webhook post failed",
        res.status,
        await res.text(),
      );
    }
  } catch (err) {
    console.error("[discord] webhook post error", err);
  }
}

// Notify a channel that someone watched a title
export async function notifyWatched(
  webhookUrl: string,
  opts: {
    userName: string;
    title: string;
    year: number | null;
    type: "movie" | "tv";
    poster: string | null;
    rating?: number | null;
    appUrl: string;
    tmdbId: number;
  },
): Promise<void> {
  const titleLine = opts.year ? `${opts.title} (${opts.year})` : opts.title;
  const stars = opts.rating ? "★".repeat(Math.round(opts.rating)) : null;
  const description = stars
    ? `**${opts.userName}** watched ${titleLine} — ${stars}`
    : `**${opts.userName}** watched ${titleLine}`;
  const path = opts.type === "movie" ? "movies" : "tv";
  const embed: DiscordEmbed = {
    description,
    color: COLOR.watched,
    url: `${opts.appUrl}/${path}/${opts.tmdbId}`,
  };
  if (opts.poster) {
    embed.thumbnail = {
      url: `https://image.tmdb.org/t/p/w185${opts.poster}`,
    };
  }
  await postWebhook(webhookUrl, { embeds: [embed] });
}

// Notify a channel that an item was added to a list
export async function notifyListItemAdded(
  webhookUrl: string,
  opts: {
    userName: string;
    title: string;
    year: number | null;
    type: "movie" | "tv";
    poster: string | null;
    listName: string;
    appUrl: string;
    tmdbId: number;
    listSlug: string;
  },
): Promise<void> {
  const titleLine = opts.year ? `${opts.title} (${opts.year})` : opts.title;
  const embed: DiscordEmbed = {
    description: `**${opts.userName}** added ${titleLine} to **${opts.listName}**`,
    color: COLOR.added,
    url: `${opts.appUrl}/lists/${opts.listSlug}`,
  };
  if (opts.poster) {
    embed.thumbnail = {
      url: `https://image.tmdb.org/t/p/w185${opts.poster}`,
    };
  }
  await postWebhook(webhookUrl, { embeds: [embed] });
}

// Send a DM to a Discord user (requires bot)
async function botRequest(
  path: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN not set");
  return fetch(`${DISCORD_API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export async function sendDM(
  discordUserId: string,
  embed: DiscordEmbed,
): Promise<void> {
  try {
    const dmRes = await botRequest("/users/@me/channels", "POST", {
      recipient_id: discordUserId,
    });
    if (!dmRes.ok) {
      console.error("[discord] create DM channel failed", dmRes.status);
      return;
    }
    const dm = (await dmRes.json()) as { id: string };
    const msgRes = await botRequest(`/channels/${dm.id}/messages`, "POST", {
      embeds: [embed],
    });
    if (!msgRes.ok) {
      console.error("[discord] send DM failed", msgRes.status);
    }
  } catch (err) {
    console.error("[discord] sendDM error", err);
  }
}

// Verify the Ed25519 signature on incoming Discord interactions
export async function verifyDiscordSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      Buffer.from(publicKey, "hex"),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const message = new TextEncoder().encode(timestamp + rawBody);
    const sig = Buffer.from(signature, "hex");
    return await crypto.subtle.verify("Ed25519", key, sig, message);
  } catch {
    return false;
  }
}
