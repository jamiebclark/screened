import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSiteAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { plexUsername, name } =
    (body as { plexUsername?: unknown; name?: unknown }) ?? {};

  if (
    !plexUsername ||
    typeof plexUsername !== "string" ||
    !plexUsername.trim()
  ) {
    return NextResponse.json(
      { error: "plexUsername is required" },
      { status: 400 },
    );
  }

  const username = plexUsername.trim();

  const existing = await prisma.user.findUnique({
    where: { pendingPlexUsername: username },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An invited user with that Plex username already exists" },
      { status: 409 },
    );
  }

  const displayName =
    typeof name === "string" && name.trim() ? name.trim() : username;

  const user = await prisma.user.create({
    data: {
      email: `invited:${username.toLowerCase()}@invited.local`,
      name: displayName,
      passwordHash: randomBytes(32).toString("hex"),
      status: "INVITED",
      pendingPlexUsername: username,
    },
    select: { id: true, name: true, pendingPlexUsername: true, status: true },
  });

  return NextResponse.json(user, { status: 201 });
}
