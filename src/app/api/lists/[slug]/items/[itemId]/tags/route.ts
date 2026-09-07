import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCurateListItems } from "@/lib/list-item-permissions";
import { buildTagVocabulary, validateTagBatch } from "@/lib/list-item-tags";

type Params = { params: Promise<{ slug: string; itemId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, itemId } = await params;

  const list = await prisma.list.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      members: { select: { userId: true, role: true } },
      tags: {
        select: { id: true, label: true, normalized: true, createdAt: true },
      },
    },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.listItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      listId: true,
      tags: {
        select: {
          listTagId: true,
          listTag: { select: { label: true, normalized: true } },
        },
      },
    },
  });
  if (!item || item.listId !== list.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memberRole =
    list.members.find((m) => m.userId === session.user.id)?.role ?? null;
  const canCurate = canCurateListItems({
    isOwner: list.ownerId === session.user.id,
    memberRole,
  });
  if (!canCurate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { labels?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Tags must be text" }, { status: 400 });
  }

  const allItemsForVocabulary = await prisma.listItem.findMany({
    where: { listId: list.id },
    select: { tags: { select: { listTagId: true } } },
  });
  const vocabulary = buildTagVocabulary(list.tags, allItemsForVocabulary);

  const existing = item.tags.map((t) => ({
    label: t.listTag.label,
    normalized: t.listTag.normalized,
  }));

  const result = validateTagBatch(body.labels, existing, vocabulary);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (result.value.createTags.length > 0) {
        await tx.listTag.createMany({
          data: result.value.createTags.map((tag) => ({
            listId: list.id,
            label: tag.label,
            normalized: tag.normalized,
          })),
          skipDuplicates: true,
        });
      }

      const createdNormalized = result.value.createTags.map(
        (t) => t.normalized,
      );
      const createdTags =
        createdNormalized.length > 0
          ? await tx.listTag.findMany({
              where: { listId: list.id, normalized: { in: createdNormalized } },
              select: { id: true },
            })
          : [];

      const listTagIds = [
        ...result.value.linkTagIds,
        ...createdTags.map((t) => t.id),
      ];

      if (listTagIds.length > 0) {
        await tx.listItemTag.createMany({
          data: listTagIds.map((listTagId) => ({
            listItemId: itemId,
            listTagId,
          })),
          skipDuplicates: true,
        });
      }
    });

    const tags = await prisma.listItemTag.findMany({
      where: { listItemId: itemId },
      select: {
        id: true,
        listTag: { select: { label: true, normalized: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      tags: tags.map((t) => ({
        id: t.id,
        label: t.listTag.label,
        normalized: t.listTag.normalized,
      })),
    });
  } catch (error) {
    console.error("Failed to add list item tags", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
