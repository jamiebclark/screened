import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = (await req.json()) as { email?: string; role?: string };
  const { email, role = "CONTRIBUTOR" } = body;

  if (!email)
    return NextResponse.json({ error: "Email required" }, { status: 400 });

  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const member = await prisma.listMember.upsert({
    where: { listId_userId: { listId: list.id, userId: invitedUser.id } },
    update: { role: role as "CONTRIBUTOR" | "VIEWER" },
    create: {
      listId: list.id,
      userId: invitedUser.id,
      role: role as "CONTRIBUTOR" | "VIEWER",
    },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  const list = await prisma.list.findUnique({ where: { slug } });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canRemove =
    list.ownerId === session.user.id || userId === session.user.id;
  if (!canRemove)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.listMember.deleteMany({
    where: { listId: list.id, userId },
  });

  return NextResponse.json({ success: true });
}
