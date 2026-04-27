import { NextRequest, NextResponse } from "next/server";
import { createPlexPin, checkPlexPin, getPlexAuthUrl } from "@/lib/plex";

/**
 * Plex sign-in flow (unauthenticated — used on the login/register pages).
 * Separate from /api/plex/link which handles linking for already-logged-in users.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action?: string;
    pinId?: number;
    returnPath?: string;
    invite?: string;
  };
  const { action } = body;

  if (action === "create-pin") {
    const pin = await createPlexPin();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const returnPath =
      typeof body.returnPath === "string" && body.returnPath.startsWith("/")
        ? body.returnPath
        : "/login";
    const invite =
      typeof body.invite === "string" && body.invite.trim()
        ? body.invite.trim()
        : undefined;
    const q = new URLSearchParams({ pinId: String(pin.id) });
    if (invite) {
      q.set("invite", invite);
    }
    const forwardUrl = `${appUrl}${returnPath}?${q.toString()}`;
    const authUrl = getPlexAuthUrl(pin.code, forwardUrl);
    return NextResponse.json({ pinId: pin.id, authUrl });
  }

  if (action === "verify-pin") {
    const { pinId } = body;
    if (!pinId)
      return NextResponse.json({ error: "pinId required" }, { status: 400 });

    const pin = await checkPlexPin(pinId);
    if (!pin.authToken) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({ verified: true, plexToken: pin.authToken });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
