import { redirect } from "next/navigation";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { getRecentLogs } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { RefreshButton } from "./refresh-button";

export const metadata = { title: "Error logs" };

function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default async function LogsPage() {
  const session = await auth();
  if (!isSiteAdminEmail(session?.user?.email)) redirect("/");

  const logs = getRecentLogs();
  const errorCount = logs.filter((l) => l.level === "error").length;
  const warnCount = logs.filter((l) => l.level === "warn").length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold">Error logs</h1>
          <p className="text-muted-foreground mt-1">
            In-memory ring buffer — last 200 entries, cleared on restart.
          </p>
        </div>
        <div className="mt-1">
          <RefreshButton />
        </div>
      </div>

      {logs.length > 0 && (
        <div className="flex gap-3 mb-6 text-sm text-muted-foreground">
          <span>
            <span className="text-destructive font-medium">{errorCount}</span>{" "}
            error{errorCount !== 1 ? "s" : ""}
          </span>
          <span>
            <span className="text-amber-500 font-medium">{warnCount}</span>{" "}
            warning{warnCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No log entries recorded yet.
        </p>
      ) : (
        <div className="rounded-lg border divide-y font-mono text-xs">
          {logs.map((entry) => (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5">
                  {entry.level === "error" ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        entry.level === "error"
                          ? "text-xs text-destructive border-destructive/40"
                          : "text-xs text-amber-600 border-amber-400/40 dark:text-amber-400"
                      }
                    >
                      {entry.level}
                    </Badge>
                    <span
                      className="text-muted-foreground"
                      title={entry.timestamp}
                    >
                      {formatRelative(entry.timestamp)}
                    </span>
                    <span className="text-muted-foreground/60 hidden sm:inline">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-foreground break-all whitespace-pre-wrap leading-relaxed">
                    {entry.message}
                  </p>
                  {entry.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
                        stack trace
                      </summary>
                      <pre className="mt-1 text-muted-foreground bg-muted/50 rounded p-2 overflow-x-auto text-[11px] leading-relaxed">
                        {entry.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
