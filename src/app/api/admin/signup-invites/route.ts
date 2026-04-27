import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateInviteToken,
  hashInviteToken,
  isSiteAdminEmail,
} from "@/lib/signup-invites";

const inviteListSelect = {
  id: true,
  createdAt: true,
  expiresAt: true,
  revokedAt: true,
  maxUses: true,
  uses: true,
  note: true,
} as const;

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function requireAdmin(session: { user?: { email?: string | null } } | null) {
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSiteAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const session = await auth();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const invites = await prisma.signupInvite.findMany({
    where: { revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: inviteListSelect,
  });

  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    expiresInDays?: number | null;
    maxUses?: number;
    note?: string | null;
  };

  const maxUses =
    typeof body.maxUses === "number" &&
    Number.isFinite(body.maxUses) &&
    body.maxUses >= 1
      ? Math.min(Math.floor(body.maxUses), 1_000_000)
      : 1;

  let expiresAt: Date | null = null;
  if (body.expiresInDays != null) {
    const d = body.expiresInDays;
    if (typeof d !== "number" || !Number.isFinite(d) || d < 0) {
      return NextResponse.json(
        { error: "Invalid expiresInDays" },
        { status: 400 },
      );
    }
    if (d > 0) {
      expiresAt = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
    }
  }

  const note =
    typeof body.note === "string"
      ? body.note.trim() || null
      : body.note === null
        ? null
        : undefined;
  if (
    body.note !== undefined &&
    body.note !== null &&
    typeof body.note !== "string"
  ) {
    return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  }

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);

  await prisma.signupInvite.create({
    data: {
      tokenHash,
      maxUses,
      note: note ?? null,
      expiresAt,
      createdById: session!.user!.id,
    },
  });

  const base = appBaseUrl().replace(/\/$/, "");
  const inviteUrl = `${base}/register?invite=${encodeURIComponent(token)}`;

  return NextResponse.json({ token, inviteUrl, expiresAt, maxUses });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const denied = requireAdmin(session);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const updated = await prisma.signupInvite.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
