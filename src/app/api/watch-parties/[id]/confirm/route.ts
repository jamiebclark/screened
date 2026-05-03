import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { confirmWatchParty } from "@/lib/watch-party";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await confirmWatchParty(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (
      message === "Watch party not found" ||
      message === "Only the host can confirm" ||
      message === "Party is not scheduled"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[watch-parties/confirm] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
