import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncTautulliUser } from "@/lib/tautulli-sync";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.tautulliConnection.findMany({
    select: { userId: true },
  });

  console.log(
    `[cron/tautulli-sync] ${new Date().toISOString()} Starting sync for ${connections.length} user(s).`,
  );

  const results = await Promise.allSettled(
    connections.map(({ userId }) => syncTautulliUser(userId)),
  );

  const summary = results.map((r, i) => ({
    userId: connections[i]!.userId,
    ...(r.status === "fulfilled"
      ? { ok: true, ...r.value }
      : {
          ok: false,
          error: r.reason instanceof Error ? r.reason.message : "Unknown error",
        }),
  }));

  const succeeded = summary.filter((s) => s.ok).length;
  const failed = summary.filter((s) => !s.ok).length;

  console.log(`[cron/tautulli-sync] ${succeeded} succeeded, ${failed} failed`);

  return NextResponse.json({ succeeded, failed, users: summary });
}
