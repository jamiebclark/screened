import { NextRequest, NextResponse } from "next/server";
import { createPlexPin, checkPlexPin, getPlexAuthUrl } from "@/lib/plex";

/**
 * Plex sign-in flow (unauthenticated — used on the login/register pages).
 * Separate from /api/plex/link which handles linking for already-logged-in users.
 */
export async function POST(req: NextRequest) {
  const body = await req.json() as { action?: string; pinId?: number };
  const { action } = body;

  if (action === "create-pin") {
    const pin = await createPlexPin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const forwardUrl = `${appUrl}/login?pinId=${pin.id}`;
    const authUrl = getPlexAuthUrl(pin.code, forwardUrl);
    return NextResponse.json({ pinId: pin.id, authUrl });
  }

  if (action === "verify-pin") {
    const { pinId } = body;
    if (!pinId) return NextResponse.json({ error: "pinId required" }, { status: 400 });

    const pin = await checkPlexPin(pinId);
    if (!pin.authToken) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({ verified: true, plexToken: pin.authToken });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
