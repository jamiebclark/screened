"use client";

import { useState, useTransition } from "react";
import { WatchEntryDialog, type WatchEntry } from "@/components/watch-entry-dialog";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CalendarCheck, Trash2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { titlePageSection } from "@/lib/title-page-layout";

interface WatchHistoryProps {
  tmdbId: number;
  type: "movie" | "tv";
  initialEntries: WatchEntry[];
  hasStatus: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function EntryCard({
  entry,
  tmdbId,
  type,
  onUpdate,
  onDelete,
}: {
  entry: WatchEntry;
  tmdbId: number;
  type: "movie" | "tv";
  onUpdate: (e: WatchEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isDeleting, startDelete] = useTransition();

  const handleDelete = () => {
    startDelete(async () => {
      const res = await fetch(`/api/media/entries/${entry.id}`, { method: "DELETE" });
      if (res.ok) onDelete(entry.id);
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          {formatDate(entry.watchedAt)}
        </span>
        <div className="flex items-center gap-1">
          {entry.letterboxdActivityUrl && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <a
                href={entry.letterboxdActivityUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open on Letterboxd"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {entry.review && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse review" : "Expand review"}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
          <WatchEntryDialog
            tmdbId={tmdbId}
            type={type}
            entry={entry}
            onSave={onUpdate}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete viewing"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {entry.review && expanded && (
        <div className="pt-1">
          <Separator className="mb-3" />
          <MarkdownContent content={entry.review} />
        </div>
      )}
    </div>
  );
}

export function WatchHistory({ tmdbId, type, initialEntries, hasStatus }: WatchHistoryProps) {
  const [entries, setEntries] = useState<WatchEntry[]>(initialEntries);

  const handleSave = (saved: WatchEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className={titlePageSection}>
      <Separator className="mb-6" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">
          Watch history
          {entries.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({entries.length} {entries.length === 1 ? "viewing" : "viewings"})
            </span>
          )}
        </h3>
        {hasStatus && (
          <WatchEntryDialog tmdbId={tmdbId} type={type} onSave={handleSave} />
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasStatus
            ? "No viewings logged yet. Click \"Log a viewing\" to record one."
            : "Set a watch status first to start logging viewings."}
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              tmdbId={tmdbId}
              type={type}
              onUpdate={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
