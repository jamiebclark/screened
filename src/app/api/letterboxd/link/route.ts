import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    action: "link" | "unlink";
    username?: string;
  };

  if (body.action === "unlink") {
    await prisma.letterboxdConnection.deleteMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "link") {
    const username = body.username?.trim().toLowerCase();
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    // Verify the profile exists and RSS is reachable
    const rssUrl = `https://letterboxd.com/${username}/rss/`;
    const check = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    if (!check.ok) {
      return NextResponse.json(
        {
          error:
            "Could not find a public Letterboxd profile for that username.",
        },
        { status: 400 },
      );
    }

    await prisma.letterboxdConnection.upsert({
      where: { userId: session.user.id },
      update: { letterboxdUsername: username, lastSyncedAt: null },
      create: { userId: session.user.id, letterboxdUsername: username },
    });

    return NextResponse.json({ ok: true, username });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
