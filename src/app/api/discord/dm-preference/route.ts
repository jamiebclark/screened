import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as unknown;
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).dmEnabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { dmEnabled } = body as { dmEnabled: boolean };

  const updated = await prisma.discordConnection.updateMany({
    where: { userId: session.user.id },
    data: { dmEnabled },
  });

  if (updated.count === 0) {
    return NextResponse.json(
      { error: "No Discord account connected" },
      { status: 404 },
    );
  }

  return NextResponse.json({ dmEnabled });
}
