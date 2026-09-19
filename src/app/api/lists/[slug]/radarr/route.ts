import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import { mediaItemsToRadarrJson } from "@/lib/radarr-export";
import { ListVisibility } from "@/lib/list-visibility";

type Params = { params: Promise<{ slug: string }> };

/**
 * Endpoint compatible with Radarr's custom list format.
 * PUBLIC lists need no auth. Site-member and private lists must pass
 * ?token=<radarrToken>, since Radarr cannot sign in.
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

  if (list.visibility !== ListVisibility.PUBLIC) {
    if (!token || token !== list.radarrToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const radarrList = mediaItemsToRadarrJson(
    list.items.map((item) => item.mediaItem),
  );

  return NextResponse.json(radarrList, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
