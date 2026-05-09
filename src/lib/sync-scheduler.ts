import cron from "node-cron";
import { CronIntegration } from "@/generated/prisma";
import { runSync } from "@/lib/sync-runner";

const ALL_INTEGRATIONS = [
  CronIntegration.PLEX,
  CronIntegration.LETTERBOXD,
  CronIntegration.JELLYFIN,
  CronIntegration.TAUTULLI,
  CronIntegration.TRAKT,
];

async function runAllSyncs() {
  console.log("[sync-scheduler] Starting scheduled sync for all integrations");
  for (const integration of ALL_INTEGRATIONS) {
    try {
      await runSync(integration);
    } catch (err) {
      console.error(`[sync-scheduler] ${integration} failed:`, err);
    }
  }
}

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

  cron.schedule(schedule, runAllSyncs);
  console.log(`[sync-scheduler] Syncs scheduled: "${schedule}"`);
}
