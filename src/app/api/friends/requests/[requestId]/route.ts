import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProfileFriendState } from "@/lib/friendship";

type Params = { params: Promise<{ requestId: string }> };

/** Cancel (sender) or decline (receiver) a friend request. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const fr = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    select: { id: true, fromUserId: true, toUserId: true },
  });
  if (!fr) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (fr.fromUserId !== session.user.id && fr.toUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const otherId =
    fr.fromUserId === session.user.id ? fr.toUserId : fr.fromUserId;
  await prisma.friendRequest.delete({ where: { id: requestId } });

  const state = await getProfileFriendState(session.user.id, otherId);
  return NextResponse.json({ friendState: state });
}
