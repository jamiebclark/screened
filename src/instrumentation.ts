export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installConsoleCapture } = await import("@/lib/logger");
    installConsoleCapture();

    const { scheduleSyncs } = await import("@/lib/sync-scheduler");
    scheduleSyncs();
  }
}
