import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getWatchParty,
  cancelWatchParty,
  rescheduleWatchParty,
} from "@/lib/watch-party";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const party = await getWatchParty(id, session.user.id);
  if (!party) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(party);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  try {
    if (b.action === "cancel") {
      await cancelWatchParty(id, session.user.id);
      return NextResponse.json({ success: true });
    }

    if (b.scheduledFor) {
      const scheduledFor = new Date(b.scheduledFor as string);
      if (isNaN(scheduledFor.getTime())) {
        return NextResponse.json(
          { error: "Invalid scheduledFor date" },
          { status: 400 },
        );
      }
      if (scheduledFor < new Date()) {
        return NextResponse.json(
          { error: "scheduledFor must be in the future" },
          { status: 400 },
        );
      }
      await rescheduleWatchParty(id, session.user.id, scheduledFor);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No valid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (
      message === "Watch party not found" ||
      message === "Only the host can cancel" ||
      message === "Only the host can reschedule" ||
      message === "Party is not scheduled"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[watch-parties/[id]] patch error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
