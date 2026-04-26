import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFriendshipAndClearPending, getProfileFriendState } from "@/lib/friendship";

type Params = { params: Promise<{ requestId: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
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
  if (fr.toUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await createFriendshipAndClearPending(fr.fromUserId, fr.toUserId);
  const state = await getProfileFriendState(session.user.id, fr.fromUserId);
  return NextResponse.json({ friendState: state });
}
