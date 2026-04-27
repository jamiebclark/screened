import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ entryId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await params;
  const body = (await req.json()) as {
    watchedAt?: string | null;
    review?: string | null;
    rating?: number | null;
  };

  const entry = await prisma.watchEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.watchedAt !== undefined)
    data.watchedAt = body.watchedAt ? new Date(body.watchedAt) : new Date();
  if (body.review !== undefined) data.review = body.review;
  if (body.rating !== undefined) data.rating = body.rating;

  const updated = await prisma.watchEntry.update({
    where: { id: entryId },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await params;

  const entry = await prisma.watchEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.watchEntry.delete({ where: { id: entryId } });
  return NextResponse.json({ success: true });
}
