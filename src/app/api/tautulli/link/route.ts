import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTautulliConnection } from "@/lib/tautulli";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    action: "link" | "unlink";
    url?: string;
    apiKey?: string;
    username?: string;
  };

  if (body.action === "unlink") {
    await prisma.tautulliConnection.deleteMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "link") {
    const url = body.url?.trim();
    const apiKey = body.apiKey?.trim();
    const username = body.username?.trim() || null;

    if (!url || !apiKey) {
      return NextResponse.json(
        { error: "Tautulli URL and API key are required" },
        { status: 400 },
      );
    }

    const check = await verifyTautulliConnection(url, apiKey);
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error ?? "Could not connect to Tautulli" },
        { status: 400 },
      );
    }

    await prisma.tautulliConnection.upsert({
      where: { userId: session.user.id },
      update: {
        tautulliUrl: url,
        apiKey,
        tautulliUsername: username,
        lastSyncedAt: null,
      },
      create: {
        userId: session.user.id,
        tautulliUrl: url,
        apiKey,
        tautulliUsername: username,
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
