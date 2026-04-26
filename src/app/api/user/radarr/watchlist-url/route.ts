import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureWatchlistRadarrToken } from "@/lib/ensure-watchlist-radarr-token";

/**
 * Returns the full Radarr "Custom List" URL for the current user's watchlist (session auth).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await ensureWatchlistRadarrToken(session.user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/api/user/radarr/watchlist?token=${token}`;

  return NextResponse.json({ url });
}
