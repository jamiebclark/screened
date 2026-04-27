import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultPickerState,
  isPickerState,
  type PickerRoomState,
} from "@/lib/picker-room-state";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { state?: unknown };
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  if (!me) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const base = defaultPickerState(me);
  let merged: PickerRoomState;
  if (body.state && isPickerState(body.state)) {
    merged = body.state;
    if (!merged.participants.some((p) => p.id === me.id)) {
      merged = { ...merged, participants: [me, ...merged.participants] };
    }
  } else {
    merged = base;
  }

  const room = await prisma.pickerRoom.create({
    data: {
      createdById: session.user.id,
      state: merged as object,
      version: 0,
    },
  });

  return NextResponse.json({
    id: room.id,
    version: room.version,
    state: merged,
  });
}
