import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { prisma } from "@/lib/prisma";
import { CronIntegration } from "@/generated/prisma";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TriggerCronButton } from "./trigger-button";

export const metadata = { title: "Cron status | Screened" };

const INTEGRATIONS: { key: CronIntegration; label: string }[] = [
  { key: CronIntegration.PLEX, label: "Plex" },
  { key: CronIntegration.LETTERBOXD, label: "Letterboxd" },
  { key: CronIntegration.JELLYFIN, label: "Jellyfin" },
  { key: CronIntegration.TAUTULLI, label: "Tautulli" },
  { key: CronIntegration.TRAKT, label: "Trakt" },
];

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

type RunStatus = "success" | "partial" | "failed";

function runStatus(succeeded: number, failed: number): RunStatus {
  if (failed === 0) return "success";
  if (succeeded === 0) return "failed";
  return "partial";
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
        </h3>
        <div className="rounded-lg border divide-y">
          {INTEGRATIONS.map(({ key, label }) => {
            const run = latestByIntegration.get(key);
            const status = run ? runStatus(run.succeeded, run.failed) : null;
            return (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-3 gap-4"
              >
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
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No runs recorded
                    </span>
                  )}
                  <TriggerCronButton integration={key} />
                </div>
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
              return (
                <div
                  key={run.id}
                  className="flex items-center justify-between px-4 py-3 gap-4"
                >
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
