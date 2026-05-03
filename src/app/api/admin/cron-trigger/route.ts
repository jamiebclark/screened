import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { CronIntegration } from "@/generated/prisma";

const CRON_ROUTES: Record<CronIntegration, string> = {
  [CronIntegration.PLEX]: "/api/cron/plex-sync",
  [CronIntegration.LETTERBOXD]: "/api/cron/letterboxd-sync",
  [CronIntegration.JELLYFIN]: "/api/cron/jellyfin-sync",
  [CronIntegration.TAUTULLI]: "/api/cron/tautulli-sync",
  [CronIntegration.TRAKT]: "/api/cron/trakt-sync",
};

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

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const cronPath = CRON_ROUTES[integration as CronIntegration];
  const response = await fetch(`${baseUrl}${cronPath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
