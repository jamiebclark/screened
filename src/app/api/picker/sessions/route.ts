import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  ReferenceMovieJson,
  ScoredMovieJson,
} from "@/lib/picker-room-state";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessions = await prisma.pickerSession.findMany({
    where: { createdById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    roomId?: string;
    participants?: unknown;
    attractors?: unknown;
    results?: unknown;
    pickedTmdbId?: unknown;
  };

  if (
    !Array.isArray(body.participants) ||
    !Array.isArray(body.attractors) ||
    !Array.isArray(body.results)
  ) {
    return NextResponse.json(
      { error: "participants, attractors, and results are required arrays" },
      { status: 400 },
    );
  }

  const pickedTmdbId =
    typeof body.pickedTmdbId === "number" ? body.pickedTmdbId : null;

  if (body.roomId !== undefined && typeof body.roomId !== "string") {
    return NextResponse.json(
      { error: "roomId must be a string" },
      { status: 400 },
    );
  }

  const pickerSession = await prisma.pickerSession.create({
    data: {
      createdById: session.user.id,
      roomId: body.roomId ?? null,
      participants: body.participants as object[],
      attractors: body.attractors as ReferenceMovieJson[],
      results: body.results as ScoredMovieJson[],
      pickedTmdbId,
    },
  });

  return NextResponse.json({ session: pickerSession }, { status: 201 });
}
