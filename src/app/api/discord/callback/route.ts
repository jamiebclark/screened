import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("discord_oauth_state")?.value;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/settings/discord?error=invalid_state", appUrl));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings/discord?error=not_configured", appUrl));
  }

  const redirectUri = `${appUrl}/api/discord/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[discord] token exchange failed", tokenRes.status, await tokenRes.text());
    return NextResponse.redirect(new URL("/settings/discord?error=token_exchange", appUrl));
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  // Fetch Discord user info
  const userRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/settings/discord?error=user_fetch", appUrl));
  }

  const discordUser = (await userRes.json()) as {
    id: string;
    username: string;
    discriminator: string;
    global_name?: string | null;
  };

  const discordUsername = discordUser.global_name ?? discordUser.username;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.discordConnection.upsert({
    where: { userId: session.user.id },
    update: {
      discordUserId: discordUser.id,
      discordUsername,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    },
    create: {
      userId: session.user.id,
      discordUserId: discordUser.id,
      discordUsername,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    },
  });

  const response = NextResponse.redirect(new URL("/settings/discord?linked=1", appUrl));
  response.cookies.delete("discord_oauth_state");
  return response;
}
