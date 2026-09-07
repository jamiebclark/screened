"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ListStats } from "@/lib/list-stats";
import { countryDisplayName } from "@/lib/production-countries";

interface ListStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: ListStats;
}

export function ListStatsModal({
  open,
  onOpenChange,
  stats,
}: ListStatsModalProps) {
  const isEmpty = stats.totalItems === 0;

  const tiles = [
    { label: "Items", value: stats.totalItems },
    { label: "Still in play", value: stats.visibleItems },
    { label: "Decades", value: stats.distinctDecades },
    { label: "Tags in use", value: stats.distinctVisibleTags },
    { label: "Countries", value: stats.distinctVisibleCountries },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>List stats</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{tile.label}</p>
              <p className="text-2xl font-semibold">{tile.value}</p>
            </div>
          ))}
        </div>

        {stats.countryCounts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-base font-semibold">
              Countries{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {stats.countryCounts.length}
              </span>
            </h3>
            <ul className="divide-y rounded-lg border">
              {stats.countryCounts.map((country) => (
                <li
                  key={country.code}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="truncate text-sm">
                    {countryDisplayName(country.code)}
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {country.count} {country.count === 1 ? "film" : "films"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats.tagCounts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-base font-semibold">
              Tags{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {stats.tagCounts.length}
              </span>
            </h3>
            <ul className="divide-y rounded-lg border">
              {stats.tagCounts.map((tag) => (
                <li
                  key={tag.normalized}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <span className="truncate text-sm">{tag.label}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {tag.count} {tag.count === 1 ? "film" : "films"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isEmpty && (
          <p className="text-sm text-muted-foreground">
            Nothing to summarise yet — add some titles.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
