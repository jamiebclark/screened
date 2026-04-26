import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileContentVisibility } from "@/generated/prisma";

function parseVisibility(v: unknown): ProfileContentVisibility | null {
  if (v === "PUBLIC" || v === "FRIENDS") return v;
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { watchlistVisibility: true, watchHistoryVisibility: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    watchlistVisibility?: unknown;
    watchHistoryVisibility?: unknown;
  };

  const wl = body.watchlistVisibility !== undefined
    ? parseVisibility(body.watchlistVisibility)
    : undefined;
  const wh = body.watchHistoryVisibility !== undefined
    ? parseVisibility(body.watchHistoryVisibility)
    : undefined;

  if (wl === null || wh === null) {
    return NextResponse.json(
      { error: "Invalid visibility. Use PUBLIC or FRIENDS." },
      { status: 400 }
    );
  }
  if (wl === undefined && wh === undefined) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const data: { watchlistVisibility?: ProfileContentVisibility; watchHistoryVisibility?: ProfileContentVisibility } =
    {};
  if (wl !== undefined) data.watchlistVisibility = wl;
  if (wh !== undefined) data.watchHistoryVisibility = wh;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { watchlistVisibility: true, watchHistoryVisibility: true },
  });

  return NextResponse.json(user);
}
