import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sortedFriendshipUserIds } from "@/lib/profile-visibility";
import { getProfileFriendState } from "@/lib/friendship";

type Params = { params: Promise<{ userId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId: otherId } = await params;
  if (otherId === session.user.id) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const { userLowId, userHighId } = sortedFriendshipUserIds(
    session.user.id,
    otherId,
  );
  const row = await prisma.friendship.findUnique({
    where: { userLowId_userHighId: { userLowId, userHighId } },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Not friends" }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id: row.id } });
  const friendState = await getProfileFriendState(session.user.id, otherId);
  return NextResponse.json({ friendState });
}
