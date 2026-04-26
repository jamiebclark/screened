import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function hasBcryptPasswordHash(passwordHash: string): boolean {
  return passwordHash.startsWith("$2");
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      name?: unknown;
      email?: unknown;
      currentPassword?: unknown;
      newPassword?: unknown;
    };

    const nameRaw = typeof body.name === "string" ? body.name.trim() : undefined;
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : undefined;
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : undefined;

    if (nameRaw === undefined && emailRaw === undefined && newPassword === undefined) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const credentialAccount = hasBcryptPasswordHash(user.passwordHash);

    const data: { name?: string; email?: string; passwordHash?: string } = {};

    if (nameRaw !== undefined) {
      if (!nameRaw) {
        return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
      }
      if (nameRaw.length > 100) {
        return NextResponse.json({ error: "Display name is too long" }, { status: 400 });
      }
      if (nameRaw !== user.name) {
        data.name = nameRaw;
      }
    }

    if (emailRaw !== undefined) {
      if (!emailRaw || !emailRaw.includes("@")) {
        return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
      }
      if (emailRaw !== user.email) {
        if (credentialAccount) {
          if (!currentPassword) {
            return NextResponse.json(
              { error: "Current password is required to change your email" },
              { status: 400 }
            );
          }
          const valid = await bcrypt.compare(currentPassword, user.passwordHash);
          if (!valid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
          }
        }
        const taken = await prisma.user.findUnique({ where: { email: emailRaw } });
        if (taken) {
          return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
        }
        data.email = emailRaw;
      }
    }

    if (newPassword !== undefined) {
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters" },
          { status: 400 }
        );
      }
      if (credentialAccount) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "Current password is required to set a new password" },
            { status: 400 }
          );
        }
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) {
          return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
        }
      }
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({
        user: { id: user.id, name: user.name, email: user.email },
        message: "Nothing to update",
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ user: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
