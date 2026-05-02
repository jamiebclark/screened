import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyOverseerrConnection } from "@/lib/overseerr";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    action: "link" | "unlink";
    serverUrl?: string;
    apiKey?: string;
  };

  if (body.action === "unlink") {
    await prisma.overseerrConnection.deleteMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "link") {
    const serverUrl = body.serverUrl?.trim();
    const apiKey = body.apiKey?.trim();

    if (!serverUrl || !apiKey) {
      return NextResponse.json(
        { error: "Server URL and API key are required" },
        { status: 400 },
      );
    }

    const check = await verifyOverseerrConnection(serverUrl, apiKey);
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error ?? "Could not connect to Overseerr" },
        { status: 400 },
      );
    }

    await prisma.overseerrConnection.upsert({
      where: { userId: session.user.id },
      update: { serverUrl, apiKey },
      create: { userId: session.user.id, serverUrl, apiKey },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
