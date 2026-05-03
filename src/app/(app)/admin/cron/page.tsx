import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { prisma } from "@/lib/prisma";
import { CronIntegration } from "@/generated/prisma";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TriggerCronButton } from "./trigger-button";

export const metadata = { title: "Cron status" };

const INTEGRATIONS: { key: CronIntegration; label: string }[] = [
  { key: CronIntegration.PLEX, label: "Plex" },
  { key: CronIntegration.LETTERBOXD, label: "Letterboxd" },
  { key: CronIntegration.JELLYFIN, label: "Jellyfin" },
  { key: CronIntegration.TAUTULLI, label: "Tautulli" },
  { key: CronIntegration.TRAKT, label: "Trakt" },
];

const SYNC_INTERVAL_HOURS = parseInt(
  process.env.SYNC_INTERVAL_HOURS ?? "6",
  10,
);
const SYNC_INTERVAL_MS = SYNC_INTERVAL_HOURS * 3600 * 1000;

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

type UserResult = { userId: string; ok: boolean; error?: string };

type RunStatus = "success" | "partial" | "failed";

function runStatus(succeeded: number, failed: number): RunStatus {
  if (failed === 0) return "success";
  if (succeeded === 0) return "failed";
  return "partial";
}

type ServiceHealth = "on_schedule" | "overdue" | "never_run";

function serviceHealth(lastRanAt: Date | null): ServiceHealth {
  if (!lastRanAt) return "never_run";
  return lastRanAt.getTime() + SYNC_INTERVAL_MS > Date.now()
    ? "on_schedule"
    : "overdue";
}

function formatNextRun(lastRanAt: Date | null): string | null {
  if (!lastRanAt) return null;
  const diffMs = lastRanAt.getTime() + SYNC_INTERVAL_MS - Date.now();
  const absMins = Math.floor(Math.abs(diffMs) / 60000);
  const absHours = Math.floor(absMins / 60);
  const remMins = absMins % 60;
  const label =
    absHours > 0
      ? remMins > 0
        ? `${absHours}h ${remMins}m`
        : `${absHours}h`
      : `${absMins}m`;
  return diffMs > 0 ? `in ${label}` : `${label} overdue`;
}

export default async function CronStatusPage() {
  const session = await auth();
  if (!isSiteAdminEmail(session?.user?.email)) redirect("/settings");

  const recentRuns = await prisma.cronRun.findMany({
    orderBy: { ranAt: "desc" },
    take: 50,
  });

  const latestByIntegration = new Map(
    INTEGRATIONS.map(({ key }) => [
      key,
      recentRuns.find((r) => r.integration === key) ?? null,
    ]),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Cron status</h1>
      <p className="text-muted-foreground mb-8">
        Sync job history across all integrations.
      </p>

      <section aria-labelledby="summary-heading" className="mb-10">
        <h3 id="summary-heading" className="text-base font-semibold mb-3">
          Last run per integration
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            every {SYNC_INTERVAL_HOURS}h
          </span>
        </h3>
        <div className="rounded-lg border divide-y">
          {INTEGRATIONS.map(({ key, label }) => {
            const run = latestByIntegration.get(key);
            const status = run ? runStatus(run.succeeded, run.failed) : null;
            const health = serviceHealth(run?.ranAt ?? null);
            const nextRun = formatNextRun(run?.ranAt ?? null);
            const failures =
              run && run.failed > 0
                ? (run.result as UserResult[]).filter((r) => !r.ok)
                : [];
            return (
              <div key={key} className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {status === "success" && (
                      <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                    )}
                    {status === "partial" && (
                      <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
                    )}
                    {status === "failed" && (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    {status === null && (
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{label}</span>
                    {health === "on_schedule" && (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600 border-green-300 dark:text-green-400 dark:border-green-700"
                      >
                        On schedule
                      </Badge>
                    )}
                    {health === "overdue" && (
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                      >
                        Overdue
                      </Badge>
                    )}
                    {health === "never_run" && (
                      <Badge variant="outline" className="text-xs">
                        Never run
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {run ? (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatRelative(run.ranAt)}</span>
                        <span>{formatDuration(run.durationMs)}</span>
                        <span>
                          {run.succeeded} ok
                          {run.failed > 0 && (
                            <span className="text-destructive ml-1">
                              / {run.failed} failed
                            </span>
                          )}
                        </span>
                        {nextRun && (
                          <span
                            className={
                              health === "overdue"
                                ? "text-amber-600 dark:text-amber-400"
                                : ""
                            }
                          >
                            {nextRun}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No runs recorded
                      </span>
                    )}
                    <TriggerCronButton integration={key} />
                  </div>
                </div>
                {failures.length > 0 && (
                  <RunFailureDetails failures={failures} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="history-heading">
        <h3 id="history-heading" className="text-base font-semibold mb-3">
          Recent runs
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            last 50
          </span>
        </h3>
        {recentRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {recentRuns.map((run) => {
              const status = runStatus(run.succeeded, run.failed);
              const failures =
                run.failed > 0
                  ? (run.result as UserResult[]).filter((r) => !r.ok)
                  : [];
              return (
                <div key={run.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {status === "success" && (
                        <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                      )}
                      {status === "partial" && (
                        <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
                      )}
                      {status === "failed" && (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <Badge variant="outline" className="text-xs font-mono">
                        {run.integration}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                      <span title={run.ranAt.toISOString()}>
                        {formatRelative(run.ranAt)}
                      </span>
                      <span>{formatDuration(run.durationMs)}</span>
                      <span>
                        {run.succeeded} ok
                        {run.failed > 0 && (
                          <span className="text-destructive ml-1">
                            / {run.failed} failed
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {failures.length > 0 && (
                    <RunFailureDetails failures={failures} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function RunFailureDetails({ failures }: { failures: UserResult[] }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-destructive select-none list-none flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        {failures.length} failure{failures.length !== 1 ? "s" : ""} — click to
        expand
      </summary>
      <ul className="mt-2 space-y-1 pl-4">
        {failures.map((f) => (
          <li
            key={f.userId}
            className="text-xs text-muted-foreground font-mono"
          >
            <span className="text-foreground">{f.userId.slice(0, 8)}…</span>
            {f.error && (
              <span className="text-destructive ml-2">{f.error}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
