import { CronIntegration } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { syncPlexUser } from "@/lib/plex-sync";
import { syncLetterboxdUser } from "@/lib/letterboxd-sync";
import { syncJellyfinUser } from "@/lib/jellyfin-sync";
import { syncTautulliUser } from "@/lib/tautulli-sync";
import { syncTraktUser } from "@/lib/trakt-sync";

export async function runSync(integration: CronIntegration) {
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

  await prisma.cronRun.create({
    data: {
      integration,
      durationMs: Date.now() - startedAt,
      succeeded,
      failed,
      result: summary,
    },
  });

  console.log(
    `[sync-runner] ${integration}: ${succeeded} succeeded, ${failed} failed (${Date.now() - startedAt}ms)`,
  );

  return { succeeded, failed, users: summary };
}
