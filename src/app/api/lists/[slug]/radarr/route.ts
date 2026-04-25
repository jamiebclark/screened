import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ slug: string }> };

/**
 * Public endpoint compatible with Radarr's custom list format.
 * For private lists, pass ?token=<radarrToken> for authentication.
 * Only returns MOVIE items from the list.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const list = await prisma.list.findUnique({
    where: { slug },
    include: {
      items: {
        where: { mediaItem: { type: MediaType.MOVIE } },
        include: { mediaItem: true },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!list.isPublic) {
    if (!token || token !== list.radarrToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const radarrList = list.items.map((item) => ({
    tmdbId: item.mediaItem.tmdbId,
    title: item.mediaItem.title,
    year: item.mediaItem.year,
  }));

  return NextResponse.json(radarrList, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
