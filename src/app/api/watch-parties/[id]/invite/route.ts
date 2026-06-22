import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addInvitesToWatchParty } from "@/lib/watch-party";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
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
  if (
    !Array.isArray(b.inviteeIds) ||
    b.inviteeIds.some((x) => typeof x !== "string")
  ) {
    return NextResponse.json(
      { error: "inviteeIds must be an array of strings" },
      { status: 400 },
    );
  }

  const inviteeIds = b.inviteeIds as string[];
  if (inviteeIds.length === 0) {
    return NextResponse.json(
      { error: "No invitees provided" },
      { status: 400 },
    );
  }

  try {
    const created = await addInvitesToWatchParty(
      id,
      session.user.id,
      inviteeIds,
    );
    return NextResponse.json({ added: created.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const knownErrors = [
      "Watch party not found",
      "Only the host can invite",
      "Party is not scheduled",
      "Host cannot be an invitee",
      "All invitees must be friends",
    ];
    if (knownErrors.includes(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[watch-parties/[id]/invite] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
