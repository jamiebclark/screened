export async function register() {
  // Skip only for Edge runtime — in standalone production NEXT_RUNTIME may be
  // undefined, so checking === "nodejs" causes the scheduler to never start.
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { installConsoleCapture } = await import("@/lib/logger");
  installConsoleCapture();

  console.warn(
    "[instrumentation] register() running, NEXT_RUNTIME =",
    process.env.NEXT_RUNTIME,
  );

  const { scheduleSyncs } = await import("@/lib/sync-scheduler");
  scheduleSyncs();
}
