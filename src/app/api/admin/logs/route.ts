import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { getRecentLogs } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSiteAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(getRecentLogs());
}
