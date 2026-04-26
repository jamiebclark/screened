import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  bumpPlexLibraryIndexCacheGeneration,
  createPlexPin,
  checkPlexPin,
  getPlexAuthUrl,
  getPlexUser,
  getPlexServers,
} from "@/lib/plex";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { action?: string; pinId?: number; returnPath?: string };
  const { action } = body;

  if (action === "create-pin") {
    const pin = await createPlexPin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const allowedReturnPaths = ["/settings/plex", "/onboarding"] as const;
    const raw =
      typeof body.returnPath === "string" && (allowedReturnPaths as readonly string[]).includes(body.returnPath)
        ? body.returnPath
        : "/settings/plex";
    const forwardUrl = `${appUrl}${raw}?pinId=${pin.id}`;
    const authUrl = getPlexAuthUrl(pin.code, forwardUrl);
    return NextResponse.json({ pinId: pin.id, authUrl });
  }

  if (action === "verify-pin") {
    const { pinId } = body;
    if (!pinId) return NextResponse.json({ error: "pinId required" }, { status: 400 });

    const pin = await checkPlexPin(pinId);
    if (!pin.authToken) {
      return NextResponse.json({ verified: false });
    }

    const plexUser = await getPlexUser(pin.authToken);
    const servers = await getPlexServers(pin.authToken);
    const firstServer = servers.find((s) => s.accessToken);

    await prisma.plexConnection.upsert({
      where: { userId: session.user.id },
      update: {
        plexToken: pin.authToken,
        plexUsername: plexUser.username,
        plexServerId: firstServer?.machineIdentifier ?? null,
      },
      create: {
        userId: session.user.id,
        plexToken: pin.authToken,
        plexClientId: "screened",
        plexUsername: plexUser.username,
        plexServerId: firstServer?.machineIdentifier ?? null,
      },
    });

    bumpPlexLibraryIndexCacheGeneration(session.user.id);

    return NextResponse.json({ verified: true, username: plexUser.username });
  }

  if (action === "unlink") {
    await prisma.plexConnection.deleteMany({ where: { userId: session.user.id } });
    bumpPlexLibraryIndexCacheGeneration(session.user.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
