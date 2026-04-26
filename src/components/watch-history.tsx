"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { WatchEntryDialog, type WatchEntry } from "@/components/watch-entry-dialog";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarCheck, Trash2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { titlePageSection } from "@/lib/title-page-layout";
import { historyDayPath, localCalendarParts } from "@/lib/history-calendar";
import { cn } from "@/lib/utils";

/** Server-serialized row for a title; includes other users with visible watch history. */
export type TitlePageWatchEntryClient = {
  id: string;
  userId: string;
  isViewer: boolean;
  watchedAt: string;
  review: string | null;
  rating: number | null;
  letterboxdActivityUrl: string | null;
  user: { id: string; name: string; avatarUrl: string | null } | null;
};

interface WatchHistoryProps {
  tmdbId: number;
  type: "movie" | "tv";
  viewerUserId: string;
  initialEntries: TitlePageWatchEntryClient[];
  hasStatus: boolean;
  /** YYYY-MM-DD — pre-fills &quot;Log a viewing&quot; from search / day pages. */
  prefillLogDate?: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function EntryCard({
  entry,
  tmdbId,
  type,
  onUpdate,
  onDelete,
  prefillLogDate,
}: {
  entry: TitlePageWatchEntryClient;
  tmdbId: number;
  type: "movie" | "tv";
  onUpdate: (e: WatchEntry) => void;
  onDelete: (id: string) => void;
  prefillLogDate: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isDeleting, startDelete] = useTransition();
  const isOwn = entry.isViewer;

  const handleDelete = () => {
    startDelete(async () => {
      const res = await fetch(`/api/media/entries/${entry.id}`, { method: "DELETE" });
      if (res.ok) onDelete(entry.id);
    });
  };

  const { year, month, day } = localCalendarParts(new Date(entry.watchedAt));
  const dayHref = historyDayPath(year, month, day);

  const forDialog: WatchEntry = {
    id: entry.id,
    watchedAt: entry.watchedAt,
    review: entry.review,
    rating: entry.rating,
    letterboxdActivityUrl: entry.letterboxdActivityUrl,
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div
        className={cn(
          "flex items-start justify-between gap-2",
          !isOwn && "flex-wrap sm:flex-nowrap"
        )}
      >
        {isOwn ? (
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <Link
              href={dayHref}
              className="flex min-w-0 items-center gap-1.5 text-sm font-medium hover:text-primary underline-offset-4 hover:underline"
            >
              <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              {formatDate(entry.watchedAt)}
            </Link>
            <div className="flex shrink-0 items-center gap-1">
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
                entry={forDialog}
                onSave={onUpdate}
                defaultWatchedAtForNew={prefillLogDate}
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
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <Link href={`/profile/${entry.user?.id}`} className="shrink-0 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="sr-only">{entry.user?.name} profile</span>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={entry.user?.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-xs">{initialsFromName(entry.user?.name ?? "")}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <Link
                    href={`/profile/${entry.user?.id}`}
                    className="truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {entry.user?.name}
                  </Link>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(entry.watchedAt)}
                </p>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
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
            </div>
          </>
        )}
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

function toClientRow(saved: WatchEntry, viewerUserId: string, prevUser: TitlePageWatchEntryClient["user"]): TitlePageWatchEntryClient {
  return {
    id: saved.id,
    userId: viewerUserId,
    isViewer: true,
    watchedAt: saved.watchedAt,
    review: saved.review,
    rating: saved.rating,
    letterboxdActivityUrl: saved.letterboxdActivityUrl ?? null,
    user: prevUser,
  };
}

export function WatchHistory({
  tmdbId,
  type,
  viewerUserId,
  initialEntries,
  hasStatus,
  prefillLogDate = null,
}: WatchHistoryProps) {
  const [entries, setEntries] = useState<TitlePageWatchEntryClient[]>(initialEntries);

  const handleSave = (saved: WatchEntry) => {
    setEntries((prev) => {
      const row = toClientRow(
        saved,
        viewerUserId,
        (() => {
          const idx = prev.findIndex((e) => e.id === saved.id);
          return idx >= 0 ? prev[idx]!.user : null;
        })()
      );
      const idx = prev.findIndex((e) => e.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [row, ...prev];
    });
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const hasOwnEntry = entries.some((e) => e.isViewer);

  return (
    <div className={titlePageSection}>
      <Separator className="mb-6" />
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-base font-semibold">
          Watch history
          {entries.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({entries.length} {entries.length === 1 ? "viewing" : "viewings"})
            </span>
          )}
        </h3>
        {hasStatus && (
          <WatchEntryDialog
            tmdbId={tmdbId}
            type={type}
            onSave={handleSave}
            defaultWatchedAtForNew={prefillLogDate}
          />
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
              prefillLogDate={prefillLogDate}
            />
          ))}
          {!hasStatus && (
            <p className="text-sm text-muted-foreground pt-1">
              Set a watch status on this title to log your own viewings.
            </p>
          )}
          {hasStatus && !hasOwnEntry && (
            <p className="text-sm text-muted-foreground pt-1">
              You have not logged a viewing here yet. Use &quot;Log a viewing&quot; to add one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
