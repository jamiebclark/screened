import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            {
              plexConnection: {
                plexUsername: { contains: q, mode: "insensitive" },
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      plexConnection: { select: { plexUsername: true } },
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
