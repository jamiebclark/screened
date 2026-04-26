import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastPickerRoom } from "@/lib/picker-room-broadcast";
import { isPickerState, type PickerRoomState } from "@/lib/picker-room-state";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const room = await prisma.pickerRoom.findUnique({ where: { id } });
  if (!room) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const st = room.state;
  if (!isPickerState(st)) {
    return NextResponse.json({ error: "Corrupt state" }, { status: 500 });
  }
  return NextResponse.json({ version: room.version, state: st });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json()) as { state?: unknown; sourceTabId?: string };
  if (!body.state || !isPickerState(body.state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }
  const state: PickerRoomState = body.state;
  const sourceTabId = typeof body.sourceTabId === "string" ? body.sourceTabId : "";

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });
  if (me && !state.participants.some((p) => p.id === me.id)) {
    return NextResponse.json(
      { error: "Requesting user must appear in participants" },
      { status: 400 }
    );
  }

  try {
    const room = await prisma.pickerRoom.update({
      where: { id },
      data: { state: state as object, version: { increment: 1 } },
    });
    const st = room.state;
    if (!isPickerState(st)) {
      return NextResponse.json({ error: "Invalid stored state" }, { status: 500 });
    }
    broadcastPickerRoom(id, { version: room.version, state: st, sourceTabId });
    return NextResponse.json({ version: room.version, state: st });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
