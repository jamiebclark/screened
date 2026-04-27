import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  areFriends,
  createFriendshipAndClearPending,
  getProfileFriendState,
  notifyFriendRequest,
} from "@/lib/friendship";

const friendSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [asLow, asHigh, outgoing, incoming] = await Promise.all([
    prisma.friendship.findMany({
      where: { userLowId: userId },
      include: { userHigh: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { userHighId: userId },
      include: { userLow: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { fromUserId: userId },
      include: { toUser: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendRequest.findMany({
      where: { toUserId: userId },
      include: { fromUser: { select: friendSelect } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const friends = [
    ...asLow.map((f) => f.userHigh),
    ...asHigh.map((f) => f.userLow),
  ];

  return NextResponse.json({
    friends,
    outgoing: outgoing.map((r) => ({
      id: r.id,
      toUser: r.toUser,
      createdAt: r.createdAt,
    })),
    incoming: incoming.map((r) => ({
      id: r.id,
      fromUser: r.fromUser,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { toUserId?: unknown };
  const toUserId =
    typeof body.toUserId === "string" ? body.toUserId.trim() : "";
  if (!toUserId) {
    return NextResponse.json({ error: "toUserId required" }, { status: 400 });
  }
  if (toUserId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot add yourself" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (await areFriends(session.user.id, toUserId)) {
    return NextResponse.json({ error: "Already friends" }, { status: 409 });
  }

  const forward = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: session.user.id, toUserId } },
  });
  if (forward) {
    return NextResponse.json(
      { error: "A request is already pending", requestId: forward.id },
      { status: 409 },
    );
  }

  const reverse = await prisma.friendRequest.findUnique({
    where: {
      fromUserId_toUserId: { fromUserId: toUserId, toUserId: session.user.id },
    },
  });
  if (reverse) {
    await createFriendshipAndClearPending(session.user.id, toUserId);
    const friendState = await getProfileFriendState(session.user.id, toUserId);
    return NextResponse.json(
      { status: "friends" as const, friendState },
      { status: 201 },
    );
  }

  const created = await prisma.friendRequest.create({
    data: { fromUserId: session.user.id, toUserId },
    select: { id: true, createdAt: true },
  });

  await notifyFriendRequest(created.id, toUserId);

  return NextResponse.json(
    {
      status: "pending" as const,
      requestId: created.id,
      createdAt: created.createdAt,
    },
    { status: 201 },
  );
}
