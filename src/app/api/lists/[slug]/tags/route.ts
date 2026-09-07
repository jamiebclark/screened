import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCurateListItems } from "@/lib/list-item-permissions";
import { validateTagName } from "@/lib/list-item-tags";

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const list = await prisma.list.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
    },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberRole =
    list.members.find((m) => m.userId === session.user.id)?.role ?? null;
  const canCurate = canCurateListItems({
    isOwner: list.ownerId === session.user.id,
    memberRole,
  });
  if (!canCurate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { label?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Tag must be text" }, { status: 400 });
  }

  const nameResult = validateTagName(body.label);
  if (!nameResult.ok) {
    return NextResponse.json({ error: nameResult.error }, { status: 400 });
  }
  const { label, normalized } = nameResult.value;

  try {
    const existing = await prisma.listTag.findUnique({
      where: { listId_normalized: { listId: list.id, normalized } },
      select: { id: true, label: true, normalized: true },
    });

    const tag = await prisma.listTag.upsert({
      where: { listId_normalized: { listId: list.id, normalized } },
      update: {},
      create: { listId: list.id, label, normalized },
      select: { id: true, label: true, normalized: true },
    });

    return NextResponse.json({ tag }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("Failed to declare list tag", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
