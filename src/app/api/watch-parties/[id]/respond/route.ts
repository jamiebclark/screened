import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { respondToInvite } from "@/lib/watch-party";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: watchPartyId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body as { status?: unknown };
  if (status !== "ACCEPTED" && status !== "DECLINED") {
    return NextResponse.json(
      { error: "status must be ACCEPTED or DECLINED" },
      { status: 400 },
    );
  }

  try {
    const invite = await respondToInvite(watchPartyId, session.user.id, status);
    return NextResponse.json(invite);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Invite not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[watch-parties/respond] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
