import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListAccessRequestStatus } from "@/generated/prisma";
import { markAccessRequestNotificationsRead } from "@/lib/list-access-requests";

type Params = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action;

  if (action !== "approve" && action !== "deny") {
    return NextResponse.json(
      { error: "action must be approve or deny" },
      { status: 400 },
    );
  }

  const request = await prisma.listAccessRequest.findUnique({
    where: { id: requestId },
    include: { list: { select: { id: true, ownerId: true, slug: true } } },
  });

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (request.list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (request.status !== ListAccessRequestStatus.PENDING) {
    return NextResponse.json(
      { error: "This request is no longer pending" },
      { status: 409 },
    );
  }

  const now = new Date();
  const adminId = session.user.id;

  if (action === "deny") {
    await prisma.listAccessRequest.update({
      where: { id: requestId },
      data: {
        status: ListAccessRequestStatus.DENIED,
        resolvedAt: now,
        resolvedById: adminId,
      },
    });
    await markAccessRequestNotificationsRead(requestId);
    return NextResponse.json({
      ok: true,
      status: ListAccessRequestStatus.DENIED,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.listMember.upsert({
      where: {
        listId_userId: { listId: request.listId, userId: request.requesterId },
      },
      update: { role: "CONTRIBUTOR" },
      create: {
        listId: request.listId,
        userId: request.requesterId,
        role: "CONTRIBUTOR",
      },
    });
    await tx.listAccessRequest.update({
      where: { id: requestId },
      data: {
        status: ListAccessRequestStatus.APPROVED,
        resolvedAt: now,
        resolvedById: adminId,
      },
    });
  });

  await markAccessRequestNotificationsRead(requestId);

  return NextResponse.json({
    ok: true,
    status: ListAccessRequestStatus.APPROVED,
    listSlug: request.list.slug,
  });
}
