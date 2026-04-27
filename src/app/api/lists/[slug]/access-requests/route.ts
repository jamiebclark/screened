import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListAccessRequestStatus } from "@/generated/prisma";
import { notifyAdminsOfPendingAccessRequest } from "@/lib/list-access-requests";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as { message?: string };
  const message =
    typeof body.message === "string"
      ? body.message.trim().slice(0, 500)
      : undefined;

  const list = await prisma.list.findUnique({
    where: { slug },
    include: { members: { select: { userId: true } } },
  });

  if (!list) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (list.isPublic) {
    return NextResponse.json(
      { error: "Public lists do not require access requests" },
      { status: 400 },
    );
  }

  const userId = session.user.id;
  const isMember =
    list.ownerId === userId || list.members.some((m) => m.userId === userId);
  if (isMember) {
    return NextResponse.json(
      { error: "You already have access" },
      { status: 400 },
    );
  }

  const existing = await prisma.listAccessRequest.findUnique({
    where: { listId_requesterId: { listId: list.id, requesterId: userId } },
  });

  if (existing?.status === ListAccessRequestStatus.PENDING) {
    return NextResponse.json(
      { error: "A request is already pending" },
      { status: 409 },
    );
  }

  if (existing?.status === ListAccessRequestStatus.APPROVED) {
    return NextResponse.json(
      { error: "Request was already approved" },
      { status: 400 },
    );
  }

  let requestId: string;

  if (existing?.status === ListAccessRequestStatus.DENIED) {
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.listAccessRequest.update({
        where: { id: existing.id },
        data: {
          status: ListAccessRequestStatus.PENDING,
          message: message ?? null,
          resolvedAt: null,
          resolvedById: null,
        },
      });
      await tx.notification.deleteMany({
        where: { listAccessRequestId: row.id },
      });
      return row;
    });
    requestId = updated.id;
  } else {
    const created = await prisma.listAccessRequest.create({
      data: {
        listId: list.id,
        requesterId: userId,
        message: message ?? null,
      },
    });
    requestId = created.id;
  }

  await notifyAdminsOfPendingAccessRequest(list.id, requestId);

  const request = await prisma.listAccessRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, createdAt: true },
  });

  return NextResponse.json(request, { status: 201 });
}
