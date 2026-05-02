import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isTraktConfigured,
  requestTraktDeviceCode,
  pollTraktDeviceToken,
  getTraktUsername,
} from "@/lib/trakt";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    action: "initiate" | "poll" | "unlink";
    deviceCode?: string;
  };

  if (body.action === "unlink") {
    await prisma.traktConnection.deleteMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (!isTraktConfigured()) {
    return NextResponse.json(
      { error: "Trakt is not configured on this server" },
      { status: 503 },
    );
  }

  if (body.action === "initiate") {
    const deviceCode = await requestTraktDeviceCode();
    return NextResponse.json(deviceCode);
  }

  if (body.action === "poll") {
    const deviceCode = body.deviceCode?.trim();
    if (!deviceCode) {
      return NextResponse.json(
        { error: "Missing device_code" },
        { status: 400 },
      );
    }

    const result = await pollTraktDeviceToken(deviceCode);

    if (result.status === "authorized") {
      const { token } = result;
      const traktUsername = await getTraktUsername(token.access_token);
      if (!traktUsername) {
        return NextResponse.json(
          { error: "Could not fetch Trakt username" },
          { status: 400 },
        );
      }

      await prisma.traktConnection.upsert({
        where: { userId: session.user.id },
        update: {
          traktUsername,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: new Date(Date.now() + token.expires_in * 1000),
          lastSyncedAt: null,
        },
        create: {
          userId: session.user.id,
          traktUsername,
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: new Date(Date.now() + token.expires_in * 1000),
        },
      });

      return NextResponse.json({ ok: true, username: traktUsername });
    }

    if (result.status === "pending") {
      return NextResponse.json({ pending: true });
    }

    if (result.status === "expired") {
      return NextResponse.json({ expired: true });
    }

    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
