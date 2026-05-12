import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { CronIntegration } from "@/generated/prisma";
import { runSync } from "@/lib/sync-runner";
import { sendConfirmationPrompts } from "@/lib/watch-party";

const ALL_INTEGRATIONS = [
  CronIntegration.PLEX,
  CronIntegration.LETTERBOXD,
  CronIntegration.JELLYFIN,
  CronIntegration.TAUTULLI,
  CronIntegration.TRAKT,
];

async function runAllSyncs() {
  console.warn("[sync-scheduler] Starting scheduled sync for all integrations");
  for (const integration of ALL_INTEGRATIONS) {
    try {
      await runSync(integration);
    } catch (err) {
      console.error(`[sync-scheduler] ${integration} failed:`, err);
    }
  }
}

async function runWatchPartyConfirm() {
  try {
    const notified = await sendConfirmationPrompts();
    if (notified > 0) {
      console.warn(
        `[sync-scheduler] watch-party-confirm: sent ${notified} confirmation prompts`,
      );
    }
  } catch (err) {
    console.error("[sync-scheduler] watch-party-confirm failed:", err);
  }
}

let syncTask: ScheduledTask | null = null;
let watchPartyTask: ScheduledTask | null = null;
let scheduled = false;

export function scheduleSyncs() {
  if (scheduled) return;
  scheduled = true;

  const schedule = process.env.SYNC_CRON_SCHEDULE ?? "0 */6 * * *";

  if (!cron.validate(schedule)) {
    console.error(
      `[sync-scheduler] Invalid SYNC_CRON_SCHEDULE "${schedule}" — skipping sync scheduling`,
    );
    return;
  }

  syncTask = cron.schedule(schedule, runAllSyncs);
  console.warn(`[sync-scheduler] Syncs scheduled: "${schedule}"`);

  watchPartyTask = cron.schedule("*/15 * * * *", runWatchPartyConfirm);
  console.warn(
    `[sync-scheduler] Watch party confirmations scheduled: every 15 minutes`,
  );

  // Watchdog: restart stopped tasks every 5 minutes
  setInterval(
    () => {
      const syncStatus = syncTask?.getStatus();
      if (syncStatus === "stopped") {
        console.warn(
          "[sync-scheduler] watchdog: sync task was stopped, restarting",
        );
        syncTask!.start();
      }
      const watchPartyStatus = watchPartyTask?.getStatus();
      if (watchPartyStatus === "stopped") {
        console.warn(
          "[sync-scheduler] watchdog: watch-party task was stopped, restarting",
        );
        watchPartyTask!.start();
      }
    },
    5 * 60 * 1000,
  );
}
