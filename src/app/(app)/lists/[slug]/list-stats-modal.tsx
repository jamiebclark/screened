"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ListStats } from "@/lib/list-stats";

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

        {isEmpty && (
          <p className="text-sm text-muted-foreground">
            Nothing to summarise yet — add some titles.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
