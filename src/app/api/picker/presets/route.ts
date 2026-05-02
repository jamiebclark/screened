import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReferenceMovieJson } from "@/lib/picker-room-state";

type ParticipantSnapshot = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const presets = await prisma.pickerRoomPreset.findMany({
    where: { createdById: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ presets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: unknown;
    participants?: unknown;
    attractors?: unknown;
  };

  if (typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!Array.isArray(body.participants)) {
    return NextResponse.json(
      { error: "participants must be an array" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.attractors)) {
    return NextResponse.json(
      { error: "attractors must be an array" },
      { status: 400 },
    );
  }

  const preset = await prisma.pickerRoomPreset.create({
    data: {
      createdById: session.user.id,
      name: body.name.trim(),
      // Store full participant snapshots in the participantIds JSON column
      participantIds: body.participants as ParticipantSnapshot[],
      attractors: body.attractors as ReferenceMovieJson[],
    },
  });

  return NextResponse.json({ preset }, { status: 201 });
}
