# Discord Integration

Screened ships a three-tier Discord integration. Each tier builds on the previous one and requires additional configuration.

---

## Overview

| Tier                     | What you get                                                                                                       | What you need                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **1 — Channel webhooks** | Post to a Discord channel when list items are added or a member marks something watched                            | A Discord server webhook URL                                                |
| **2 — Slash commands**   | `/whats-new`, `/pick`, `/link` in any server where the bot is present                                              | A Discord Application with a bot token + interactions endpoint              |
| **3 — User DMs + OAuth** | Direct message notifications when a friend watches something on your watchlist; personalised slash command results | Tier 2 env vars + OAuth client ID/secret; users link via Settings → Discord |

---

## Tier 1 — Channel Webhooks

No application-level configuration is needed. Any list owner can set a webhook URL directly from the list page.

### Steps

1. Open your Discord server, go to **Server Settings → Integrations → Webhooks**.
2. Click **New Webhook**, choose a channel, copy the webhook URL.
3. In Screened, open the list you want to post from.
4. As the list owner you will see a **Discord notifications** panel at the top of the list. Paste the webhook URL and click **Save**.

Once saved, Screened will post an embed to the channel whenever:

- A list member adds a title to the list.
- A list member marks a title as **Watched** and that title is in the list.

To stop posting, clear the webhook URL and save again.

---

## Tier 2 — Slash Commands

### Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**.
2. Give it a name (e.g. "Screened") and save.
3. Under **Bot**, click **Add Bot**. Copy the **Token** — this is your `DISCORD_BOT_TOKEN`.
4. Under **General Information**, copy the **Application ID** (`DISCORD_APPLICATION_ID`) and **Public Key** (`DISCORD_PUBLIC_KEY`).

### Set environment variables

```env
DISCORD_APPLICATION_ID="your-application-id"
DISCORD_PUBLIC_KEY="your-public-key"
DISCORD_BOT_TOKEN="your-bot-token"
```

### Register slash commands

After setting the env vars, run once:

```bash
yarn discord:register-commands
```

This registers `/whats-new`, `/pick`, and `/link` globally on your application.

### Set the interactions endpoint URL

1. In the Discord Developer Portal, go to **General Information**.
2. Set **Interactions Endpoint URL** to `https://your-screened-domain.com/api/discord/interactions`.
3. Discord will ping the endpoint to verify — make sure the app is deployed and publicly accessible over HTTPS.

### Invite the bot to your server

In the Developer Portal go to **OAuth2 → URL Generator**, select the `bot` scope, choose the permissions you want (no special permissions are required for slash commands), and open the generated URL to invite the bot.

---

## Tier 3 — User DMs and OAuth Account Linking

### Add OAuth redirect URL

1. In the Discord Developer Portal go to **OAuth2 → Redirects**.
2. Add `https://your-screened-domain.com/api/discord/callback`.

### Set environment variables (add to Tier 2 vars)

```env
DISCORD_CLIENT_ID="your-application-id"
DISCORD_CLIENT_SECRET="your-oauth-client-secret"
```

The **Client ID** is the same as `DISCORD_APPLICATION_ID`. Find the **Client Secret** under **OAuth2 → Client Information** in the portal.

### Users link their accounts

Users go to **Settings → Discord** in Screened and click **Connect Discord**. They are redirected to Discord to authorise the `identify` scope, then returned to the settings page.

Once linked:

- `/whats-new` returns personalised results based on the user's friends.
- `/pick` picks from the user's watchlist.
- When a friend marks something on their watchlist as watched, Screened sends the user a DM (requires the bot to be configured — Tier 2 env vars must also be set, and `dmEnabled` defaults to `true`).

---

## Environment variables

| Variable                 | Required for | Description                                               |
| ------------------------ | ------------ | --------------------------------------------------------- |
| `DISCORD_APPLICATION_ID` | Tier 2       | Discord Application ID (also used as OAuth Client ID)     |
| `DISCORD_PUBLIC_KEY`     | Tier 2       | Ed25519 public key for verifying interaction signatures   |
| `DISCORD_BOT_TOKEN`      | Tier 2       | Bot token for registering commands and sending DMs        |
| `DISCORD_CLIENT_ID`      | Tier 3       | OAuth2 Client ID (same value as `DISCORD_APPLICATION_ID`) |
| `DISCORD_CLIENT_SECRET`  | Tier 3       | OAuth2 Client Secret                                      |

---

## Setting the interactions endpoint URL

The endpoint is `POST /api/discord/interactions`. It:

1. Verifies the Ed25519 signature on every request using `DISCORD_PUBLIC_KEY`. Discord will **reject** the endpoint if signature verification fails.
2. Responds to the initial `PING` challenge with `PONG`.
3. Handles slash commands.

**Requirements:**

- Must be accessible over **HTTPS** — Discord will not call `http://` URLs.
- The URL must be publicly reachable by Discord's servers.
- `DISCORD_PUBLIC_KEY` must be set correctly before Discord will accept the endpoint.

---

## Troubleshooting

**Signature verification failing / 401 from interactions endpoint**

- Check that `DISCORD_PUBLIC_KEY` matches the value shown in **General Information** in the Discord Developer Portal.
- Make sure your reverse proxy is forwarding the raw request body unchanged (no body re-encoding).

**DMs not being delivered**

- Confirm `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID` are both set (both are required for Tier 2/3 DM sending).
- The recipient must share at least one server with the bot, or have their DM settings open. Discord does not allow bots to DM users who share no mutual server.
- Check server logs for `[discord] create DM channel failed` or `[discord] send DM failed` messages.

**Slash commands not appearing**

- Run `yarn discord:register-commands` to register or update commands.
- Global commands can take up to an hour to propagate after first registration.
- Check that the bot has been invited to the server.

**OAuth "invalid state" error**

- This happens when the `discord_oauth_state` cookie has expired (10 minute window) or was lost. Try the link flow again.
