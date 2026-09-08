"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import {
  BACKFILL_DEFAULT_LIMIT,
  shouldContinueBackfill,
  type BackfillBatchResult,
} from "@/lib/production-countries";

type BatchResponse = BackfillBatchResult & {
  noCountryData: number;
  failed: number;
  failures: { tmdbId: number; title: string }[];
};

type Totals = {
  processed: number;
  updated: number;
  noCountryData: number;
  failed: number;
  remaining: number;
  batches: number;
  /** A sample, not the full set — enough to tell a bad key from odd titles. */
  failures: { tmdbId: number; title: string }[];
};

const FAILURE_SAMPLE = 10;

export function BackfillCountriesButton({ remaining }: { remaining: number }) {
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setRunning(true);
    setError(null);
    setTotals(null);

    const tally: Totals = {
      processed: 0,
      updated: 0,
      noCountryData: 0,
      failed: 0,
      remaining,
      batches: 0,
      failures: [],
    };

    try {
      // Pages through batches rather than issuing one unbounded request: the
      // route costs a TMDB call per item and would otherwise time out.
      for (;;) {
        const res = await fetch(
          `/api/admin/backfill-production-countries?limit=${BACKFILL_DEFAULT_LIMIT}`,
          { method: "POST" },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? `HTTP ${res.status}`);
          break;
        }
        const batch: BatchResponse = await res.json();
        tally.processed += batch.processed;
        tally.updated += batch.updated;
        tally.noCountryData += batch.noCountryData;
        tally.failed += batch.failed;
        tally.remaining = batch.remaining;
        tally.batches += 1;
        tally.failures = [...tally.failures, ...batch.failures].slice(
          0,
          FAILURE_SAMPLE,
        );
        setTotals({ ...tally });

        if (!shouldContinueBackfill(batch, tally.batches)) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleClick} disabled={running}>
        {running ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        {running ? "Backfilling…" : "Run backfill"}
      </Button>

      {totals && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {totals.batches} {totals.batches === 1 ? "batch" : "batches"} —{" "}
            {totals.updated} filled, {totals.noCountryData} with no TMDB country
            data, {totals.failed} failed. {totals.remaining} still empty.
          </p>
          {totals.failures.length > 0 && (
            <details>
              <summary className="cursor-pointer select-none text-xs text-destructive">
                Sample of failed titles — check the server log and{" "}
                <code>TMDB_API_KEY</code>
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {totals.failures.map((f) => (
                  <li
                    key={f.tmdbId}
                    className="font-mono text-xs text-muted-foreground"
                  >
                    {f.tmdbId} — {f.title}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
