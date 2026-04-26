import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import { mediaItemsToRadarrJson } from "@/lib/radarr-export";

/**
 * Radarr custom list URL for the authenticated user's watchlist (movies only).
 * Pass ?token=<watchlistRadarrToken> — same pattern as private list Radarr URLs.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { watchlistRadarrToken: token },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statuses = await prisma.userMediaStatus.findMany({
    where: {
      userId: user.id,
      status: "WATCHLIST",
      mediaItem: { type: MediaType.MOVIE },
    },
    include: { mediaItem: true },
    orderBy: { updatedAt: "desc" },
  });

  const radarrList = mediaItemsToRadarrJson(statuses.map((s) => s.mediaItem));

  return NextResponse.json(radarrList, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
