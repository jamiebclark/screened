import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import {
  isPublicSignupAllowed,
  validateAndConsumeInvite,
  type PrismaTransaction,
} from "@/lib/signup-invites";
import type { PrismaClient } from "@/generated/prisma";

function inviteErrorMessage(
  code: "invalid" | "expired" | "exhausted" | "revoked",
): string {
  switch (code) {
    case "expired":
      return "This invite has expired";
    case "exhausted":
      return "This invite has no uses left";
    case "revoked":
      return "This invite was revoked";
    default:
      return "Invalid or expired invite";
  }
}

async function createUserWithPassword(
  client: Pick<PrismaClient, "user">,
  name: string,
  email: string,
  password: string,
) {
  const passwordHash = await bcrypt.hash(password, 12);
  return client.user.create({
    data: {
      name,
      email,
      passwordHash,
      watchlistRadarrToken: generateToken(24),
    },
    select: { id: true, email: true, name: true },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
      inviteToken?: string;
    };
    const { name, email, password, inviteToken } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "All fields required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const publicSignup = isPublicSignupAllowed();
    const userCount = await prisma.user.count();
    const bootstrap = !publicSignup && userCount === 0;
    const needInvite = !publicSignup && !bootstrap;

    if (needInvite && !inviteToken?.trim()) {
      return NextResponse.json({ error: "Invite required" }, { status: 403 });
    }

    if (publicSignup || bootstrap) {
      const user = await createUserWithPassword(prisma, name, email, password);
      return NextResponse.json(user, { status: 201 });
    }

    const out = await prisma.$transaction(async (tx) => {
      const v = await validateAndConsumeInvite(
        tx as PrismaTransaction,
        inviteToken,
      );
      if (!v.ok) {
        return { _inviteFail: v.code } as const;
      }
      const created = await createUserWithPassword(tx, name, email, password);
      return { _ok: true as const, user: created };
    });
    if ("_ok" in out && out._ok) {
      return NextResponse.json(out.user, { status: 201 });
    }
    return NextResponse.json(
      { error: inviteErrorMessage(out._inviteFail) },
      { status: 400 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
