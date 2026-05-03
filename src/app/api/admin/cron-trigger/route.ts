import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { CronIntegration } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { syncPlexUser } from "@/lib/plex-sync";
import { syncLetterboxdUser } from "@/lib/letterboxd-sync";
import { syncJellyfinUser } from "@/lib/jellyfin-sync";
import { syncTautulliUser } from "@/lib/tautulli-sync";
import { syncTraktUser } from "@/lib/trakt-sync";

async function runSync(integration: CronIntegration) {
  const startedAt = Date.now();

  let userIds: string[];
  let syncFn: (userId: string) => Promise<unknown>;

  switch (integration) {
    case CronIntegration.PLEX: {
      const conns = await prisma.plexConnection.findMany({
        select: { userId: true },
      });
      userIds = conns.map((c) => c.userId);
      syncFn = syncPlexUser;
      break;
    }
    case CronIntegration.LETTERBOXD: {
      const conns = await prisma.letterboxdConnection.findMany({
        select: { userId: true },
      });
      userIds = conns.map((c) => c.userId);
      syncFn = syncLetterboxdUser;
      break;
    }
    case CronIntegration.JELLYFIN: {
      const conns = await prisma.jellyfinConnection.findMany({
        select: { userId: true },
      });
      userIds = conns.map((c) => c.userId);
      syncFn = syncJellyfinUser;
      break;
    }
    case CronIntegration.TAUTULLI: {
      const conns = await prisma.tautulliConnection.findMany({
        select: { userId: true },
      });
      userIds = conns.map((c) => c.userId);
      syncFn = syncTautulliUser;
      break;
    }
    case CronIntegration.TRAKT: {
      const conns = await prisma.traktConnection.findMany({
        select: { userId: true },
      });
      userIds = conns.map((c) => c.userId);
      syncFn = syncTraktUser;
      break;
    }
  }

  const results = await Promise.allSettled(userIds.map((id) => syncFn(id)));
  const summary = results.map((r, i) => ({
    userId: userIds[i],
    ...(r.status === "fulfilled"
      ? { ok: true, ...(r.value as Record<string, unknown>) }
      : {
          ok: false,
          error: r.reason instanceof Error ? r.reason.message : "Unknown error",
        }),
  }));

  const succeeded = summary.filter((s) => s.ok).length;
  const failed = summary.filter((s) => !s.ok).length;

  console.log(
    `[admin/cron-trigger] ${integration}: ${succeeded} succeeded, ${failed} failed`,
  );

  await prisma.cronRun.create({
    data: {
      integration,
      durationMs: Date.now() - startedAt,
      succeeded,
      failed,
      result: summary,
    },
  });

  return { succeeded, failed, users: summary };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSiteAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { integration } = await req.json();
  if (!integration || !(integration in CronIntegration)) {
    return NextResponse.json({ error: "Invalid integration" }, { status: 400 });
  }

  try {
    const result = await runSync(integration as CronIntegration);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[admin/cron-trigger] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
