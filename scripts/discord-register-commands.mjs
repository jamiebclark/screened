#!/usr/bin/env node
/**
 * Register / update Discord slash commands for the application.
 * Run once after setting DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID:
 *   node scripts/discord-register-commands.mjs
 */

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;

if (!applicationId || !botToken) {
  console.error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN in .env before running.");
  process.exit(1);
}

const commands = [
  {
    name: "whats-new",
    description: "See what your Screened friends watched recently",
  },
  {
    name: "pick",
    description: "Pick a random title from your Screened watchlist",
  },
  {
    name: "link",
    description: "Get a link to connect your Discord account to Screened",
  },
];

const url = `https://discord.com/api/v10/applications/${applicationId}/commands`;

const res = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${botToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (res.ok) {
  const data = await res.json();
  console.log(`Registered ${data.length} command(s):`, data.map((c) => `/${c.name}`).join(", "));
} else {
  console.error("Failed to register commands:", res.status, await res.text());
  process.exit(1);
}
