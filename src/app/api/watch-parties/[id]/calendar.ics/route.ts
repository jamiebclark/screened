import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWatchParty, generateIcs } from "@/lib/watch-party";

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

  const ics = generateIcs(party);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="watch-party-${id}.ics"`,
    },
  });
}
