import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { CronIntegration } from "@/generated/prisma";
import { runSync } from "@/lib/sync-runner";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSiteAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { integration } = await req.json();
  if (!integration || !(integration in CronIntegration)) {
    return NextResponse.json({ error: "Invalid integration" }, { status: 400 });
  }

  try {
    const result = await runSync(integration as CronIntegration);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/cron-trigger] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
