"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Loader2,
  Sparkles,
  Film,
  Clock,
  Calendar,
  Star,
  X,
  Info,
  Bookmark,
  BookmarkCheck,
  Trophy,
  ThumbsUp,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WatchStatusButton } from "@/components/watch-status-button";
import { AddToListDialog } from "@/components/add-to-list-dialog";
import { RatingStars } from "@/components/rating-stars";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import type { ScoredMovieJson } from "@/lib/picker-room-state";
import { CreateWatchPartyDialog } from "@/components/create-watch-party-dialog";

type PickerWatchStatus = "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED";

// ─── Score breakdown popover ──────────────────────────────────────────────────

function ScoreBreakdown({ movie }: { movie: ScoredMovieJson }) {
  const [open, setOpen] = useState(false);
  const attractorPct = Math.round(movie.attractorScore * 100);
  const repellerPenalty = Math.round(movie.repellerScore * 70);

  return (
    <div className="relative flex flex-col items-end gap-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 justify-end hover:opacity-70 transition-opacity"
        aria-label={`Score breakdown for ${movie.title}`}
      >
        <Star className="h-3 w-3 text-yellow-500" />
        <span className="text-sm font-semibold">{attractorPct}%</span>
        <Info className="h-3 w-3 text-muted-foreground/60" />
      </button>
      <p className="text-xs text-muted-foreground">match</p>
      {open && (
        <div className="absolute top-full right-0 z-10 mt-1 w-52 rounded-lg border border-border bg-card p-2.5 text-xs shadow-md space-y-1">
          <p className="font-medium text-foreground mb-1.5">Score breakdown</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Attractor similarity</span>
            <span className="font-medium">{attractorPct}%</span>
          </div>
          {repellerPenalty > 2 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Repeller penalty</span>
              <span className="font-medium text-red-500">
                −{repellerPenalty}%
              </span>
            </div>
          )}
          <button
            className="mt-1 w-full text-right text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            <X className="h-3 w-3 ml-auto" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Scored movie actions ─────────────────────────────────────────────────────

function PickerScoredMovieActionsInner({
  tmdbId,
  title,
  initialStatus,
  initialRating,
  onInvalidatePickerStatuses,
}: {
  tmdbId: number;
  title: string;
  initialStatus: PickerWatchStatus | null;
  initialRating: number | null;
  onInvalidatePickerStatuses: () => void;
}) {
  const [trackedStatus, setTrackedStatus] = useState<PickerWatchStatus | null>(
    initialStatus,
  );
  const showRating = (trackedStatus ?? initialStatus) !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
      <WatchStatusButton
        tmdbId={tmdbId}
        type="movie"
        currentStatus={trackedStatus}
        onStatusChange={(s) => {
          setTrackedStatus(s);
          onInvalidatePickerStatuses();
        }}
      />
      <AddToListDialog
        tmdbId={tmdbId}
        type="movie"
        title={title}
        onAddedToList={onInvalidatePickerStatuses}
      />
      <CreateWatchPartyDialog tmdbId={tmdbId} mediaType="MOVIE" title={title} />
      {showRating && (
        <RatingStars
          tmdbId={tmdbId}
          type="movie"
          currentRating={initialRating}
          size="sm"
          onRatingChange={() => onInvalidatePickerStatuses()}
        />
      )}
    </div>
  );
}

function PickerScoredMovieActions({
  tmdbId,
  title,
  initialStatus,
  initialRating,
  onInvalidatePickerStatuses,
}: {
  tmdbId: number;
  title: string;
  initialStatus: PickerWatchStatus | null;
  initialRating: number | null;
  onInvalidatePickerStatuses: () => void;
}) {
  return (
    <PickerScoredMovieActionsInner
      key={`${initialStatus ?? "s"}-${initialRating ?? "r"}`}
      tmdbId={tmdbId}
      title={title}
      initialStatus={initialStatus}
      initialRating={initialRating}
      onInvalidatePickerStatuses={onInvalidatePickerStatuses}
    />
  );
}

// ─── ScoredMovieCard ──────────────────────────────────────────────────────────

function ScoredMovieCard({
  movie,
  rank,
  onDismiss,
  onToggleShortlist,
  isShortlisted,
  pickerMediaStatus,
  onPickerStatusesInvalidate,
}: {
  movie: ScoredMovieJson;
  rank: number;
  onDismiss?: (movie: ScoredMovieJson) => void;
  onToggleShortlist?: (tmdbId: number) => void;
  isShortlisted?: boolean;
  pickerMediaStatus:
    | { status: PickerWatchStatus; rating: number | null }
    | undefined;
  onPickerStatusesInvalidate: () => void;
}) {
  const scorePercent = Math.max(
    0,
    Math.min(100, ((movie.score + 1) / 2) * 100),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        <Link href={`/movies/${movie.tmdbId}`} className="shrink-0">
          {movie.poster ? (
            <Image
              src={`https://image.tmdb.org/t/p/w185${movie.poster}`}
              alt={movie.title}
              width={72}
              height={108}
              className="rounded object-cover hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-18 h-27 rounded bg-muted flex items-center justify-center">
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  #{rank}
                </span>
                <Link
                  href={`/movies/${movie.tmdbId}`}
                  className="font-semibold hover:underline"
                >
                  {movie.title}
                </Link>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {movie.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {movie.year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1">
                {onToggleShortlist && (
                  <button
                    type="button"
                    onClick={() => onToggleShortlist(movie.tmdbId)}
                    className={cn(
                      "p-0.5 rounded transition-colors",
                      isShortlisted
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title={
                      isShortlisted
                        ? "Remove from shortlist"
                        : "Add to shortlist"
                    }
                    aria-label={
                      isShortlisted
                        ? `Remove ${movie.title} from shortlist`
                        : `Add ${movie.title} to shortlist`
                    }
                  >
                    {isShortlisted ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </button>
                )}
                {onDismiss && (
                  <button
                    type="button"
                    onClick={() => onDismiss(movie)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                    title="Not for tonight — add to Not like and hide from this list"
                    aria-label={`Remove ${movie.title} from recommendations`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <ScoreBreakdown movie={movie} />
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${scorePercent}%` }}
            />
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres.slice(0, 4).map((g) => (
                <Badge
                  key={g}
                  variant="secondary"
                  className="text-xs px-1.5 py-0"
                >
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {movie.director && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Directed by {movie.director}
              {movie.cast.length > 0 && ` · ${movie.cast.join(", ")}`}
            </p>
          )}

          {movie.overview && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
              {movie.overview}
            </p>
          )}

          <PickerScoredMovieActions
            tmdbId={movie.tmdbId}
            title={movie.title}
            initialStatus={pickerMediaStatus?.status ?? null}
            initialRating={pickerMediaStatus?.rating ?? null}
            onInvalidatePickerStatuses={onPickerStatusesInvalidate}
          />
        </div>
      </div>
    </Card>
  );
}

// ─── Shortlist panel ──────────────────────────────────────────────────────────

function ShortlistPanel({
  shortlist,
  scoringResults,
  votes,
  currentUserId,
  participantCount,
  onToggleShortlist,
  onVote,
  onRecordPick,
  savingPick,
  lastSavedPick,
}: {
  shortlist: number[];
  scoringResults: ScoredMovieJson[] | null;
  votes: Record<string, number>;
  currentUserId: string;
  participantCount: number;
  onToggleShortlist: (tmdbId: number) => void;
  onVote: (tmdbId: number) => void;
  onRecordPick: (tmdbId: number) => Promise<void>;
  savingPick: boolean;
  lastSavedPick?: {
    tmdbId: number;
    sessionId: string;
    title: string;
    year: number | null;
    inviteeIds: string[];
  } | null;
}) {
  if (shortlist.length === 0) return null;

  const resultMap = new Map(scoringResults?.map((m) => [m.tmdbId, m]) ?? []);
  const shortlisted = shortlist
    .map((id) => resultMap.get(id))
    .filter((m): m is ScoredMovieJson => m !== undefined);

  if (shortlisted.length === 0) return null;

  const myVote = votes[currentUserId];
  const totalVoters = participantCount;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" />
          Shortlist
          <span className="text-sm font-normal text-muted-foreground">
            {shortlisted.length} title{shortlisted.length === 1 ? "" : "s"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {shortlisted.map((movie) => {
          const voteCount = Object.values(votes).filter(
            (v) => v === movie.tmdbId,
          ).length;
          const isUnanimous = voteCount === totalVoters && totalVoters > 0;
          const hasMyVote = myVote === movie.tmdbId;

          return (
            <div
              key={movie.tmdbId}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 border transition-colors",
                isUnanimous
                  ? "border-yellow-500/50 bg-yellow-500/10"
                  : "border-border bg-card",
              )}
            >
              <Link href={`/movies/${movie.tmdbId}`} className="shrink-0">
                {movie.poster ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${movie.poster}`}
                    alt={movie.title}
                    width={40}
                    height={60}
                    className="rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-15 rounded bg-muted flex items-center justify-center">
                    <Film className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isUnanimous && (
                    <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  )}
                  <Link
                    href={`/movies/${movie.tmdbId}`}
                    className="font-medium text-sm hover:underline truncate"
                  >
                    {movie.title}
                  </Link>
                </div>
                {movie.year && (
                  <p className="text-xs text-muted-foreground">{movie.year}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {voteCount}/{totalVoters} vote{totalVoters === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={hasMyVote ? "default" : "outline"}
                  className="h-7 gap-1 text-xs"
                  onClick={() => onVote(movie.tmdbId)}
                >
                  <ThumbsUp className="h-3 w-3" />
                  {hasMyVote ? "Voted" : "Vote"}
                </Button>
                {isUnanimous && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
                    onClick={() => onRecordPick(movie.tmdbId)}
                    disabled={savingPick}
                  >
                    {savingPick ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trophy className="h-3 w-3" />
                    )}
                    Record pick
                  </Button>
                )}
                {lastSavedPick?.tmdbId === movie.tmdbId && (
                  <CreateWatchPartyDialog
                    tmdbId={movie.tmdbId}
                    mediaType="MOVIE"
                    title={lastSavedPick.title}
                    preselectedInviteeIds={lastSavedPick.inviteeIds}
                    pickerSessionId={lastSavedPick.sessionId}
                    trigger={
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        <PartyPopper className="h-3 w-3" />
                        Watch Party
                      </button>
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={() => onToggleShortlist(movie.tmdbId)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── PickerResults ────────────────────────────────────────────────────────────

interface PickerResultsProps {
  scoringResults: ScoredMovieJson[] | null;
  visibleScoringResults: ScoredMovieJson[] | null;
  scoringInProgress: boolean;
  scoringError: string | null;
  emptyScoreHint: string | null;
  hasCompletedListRun: boolean;
  canScore: boolean;
  /** Criteria changed since last run. */
  criteriaDirty: boolean;
  /** Has attractors but has never run — show first-run prompt. */
  firstRunReady: boolean;
  pickerStatusByTmdb: Record<
    number,
    { status: PickerWatchStatus; rating: number | null }
  >;
  shortlist: number[];
  votes: Record<string, number>;
  currentUserId: string;
  participantCount: number;
  savingPick: boolean;
  onFindMovies: () => Promise<void>;
  onDismiss: (movie: ScoredMovieJson) => void;
  onUndoDismiss: (movieId: string) => void;
  onPickerStatusesInvalidate: () => void;
  onToggleShortlist: (tmdbId: number) => void;
  onVote: (tmdbId: number) => void;
  onRecordPick: (tmdbId: number) => Promise<void>;
  lastSavedPick?: {
    tmdbId: number;
    sessionId: string;
    title: string;
    year: number | null;
    inviteeIds: string[];
  } | null;
}

export function PickerResults({
  scoringResults,
  visibleScoringResults,
  scoringInProgress,
  scoringError,
  emptyScoreHint,
  hasCompletedListRun,
  canScore,
  criteriaDirty,
  firstRunReady,
  pickerStatusByTmdb,
  shortlist,
  votes,
  currentUserId,
  participantCount,
  savingPick,
  onFindMovies,
  onDismiss,
  onUndoDismiss,
  onPickerStatusesInvalidate,
  onToggleShortlist,
  onVote,
  onRecordPick,
  lastSavedPick,
}: PickerResultsProps) {
  const resultsRef = useRef<HTMLDivElement>(null);
  const prevScoringInProgressRef = useRef(scoringInProgress);

  useEffect(() => {
    const wasInProgress = prevScoringInProgressRef.current;
    prevScoringInProgressRef.current = scoringInProgress;
    if (
      wasInProgress &&
      !scoringInProgress &&
      visibleScoringResults !== null &&
      visibleScoringResults.length > 0
    ) {
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }, [scoringInProgress, visibleScoringResults]);

  const handleDismiss = (movie: ScoredMovieJson) => {
    onDismiss(movie);
    const { dismiss } = toast({
      description: `"${movie.title}" moved to Not like these.`,
      action: (
        <ToastAction
          altText="Undo"
          onClick={() => {
            onUndoDismiss(movie.id);
            dismiss();
          }}
        >
          Undo
        </ToastAction>
      ),
    });
  };

  const shortlistSet = new Set(shortlist);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-2">
        <Button
          size="lg"
          onClick={onFindMovies}
          disabled={!canScore || scoringInProgress}
          title={
            criteriaDirty
              ? "Search criteria changed — run again to refresh the ranked list."
              : undefined
          }
          className={cn(
            "px-12 gap-2",
            criteriaDirty &&
              !scoringInProgress &&
              "ring-2 ring-amber-500/90 ring-offset-2 ring-offset-background shadow-md",
          )}
        >
          {scoringInProgress ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {hasCompletedListRun
                ? "Refining matches..."
                : "Finding recommendations..."}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              {hasCompletedListRun ? "Refine list" : "Find movies"}
              {criteriaDirty ? (
                <span className="ml-1 text-xs font-normal text-amber-100">
                  · update needed
                </span>
              ) : null}
            </>
          )}
        </Button>

        {criteriaDirty && !scoringInProgress && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-500 max-w-sm">
            Your picks or filters changed since this list was built. Run search
            again to refresh results for everyone in the room.
          </p>
        )}

        {firstRunReady && !scoringInProgress && (
          <p className="text-center text-xs text-primary/80 max-w-sm">
            You&apos;re all set — click &quot;Find movies&quot; to get your
            first ranked list.
          </p>
        )}
      </div>

      {!canScore && (
        <p className="text-center text-sm text-muted-foreground">
          Click &ldquo;Movie&rdquo; above and add at least one film to like.
        </p>
      )}

      {scoringInProgress && scoringResults === null && !scoringError && (
        <Card>
          <CardContent className="py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {hasCompletedListRun
                ? "Updating your matches… everyone in this room will see the list when it's ready."
                : "Pulling similar and recommended titles, then ranking with your picks… everyone in this room will see the list when it's ready."}
            </p>
          </CardContent>
        </Card>
      )}

      {scoringError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {scoringError}
        </div>
      )}

      {scoringResults !== null && (
        <div ref={resultsRef} className="space-y-4">
          <ShortlistPanel
            shortlist={shortlist}
            scoringResults={scoringResults}
            votes={votes}
            currentUserId={currentUserId}
            participantCount={participantCount}
            onToggleShortlist={onToggleShortlist}
            onVote={onVote}
            onRecordPick={onRecordPick}
            savingPick={savingPick}
            lastSavedPick={lastSavedPick}
          />

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {scoringResults.length === 0
                ? "No matches found"
                : visibleScoringResults === null ||
                    visibleScoringResults.length === 0
                  ? "No suggestions left in this list"
                  : `${visibleScoringResults.length} match${visibleScoringResults.length === 1 ? "" : "es"}`}
            </h2>
            {visibleScoringResults !== null &&
              visibleScoringResults.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Similar &amp; recommended titles, ranked by your likes and
                  not-likes
                </p>
              )}
          </div>

          {scoringResults.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Film className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {emptyScoreHint ??
                    "No results for this run. Try different references, switch search mode, or relax filters."}
                </p>
              </CardContent>
            </Card>
          ) : visibleScoringResults === null ||
            visibleScoringResults.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <X className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Every suggestion from this run is marked not for tonight. Run
                  the search again with the button above, or remove titles from
                  Not like these to bring them back into play.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visibleScoringResults.map((movie, i) => (
                <ScoredMovieCard
                  key={movie.id}
                  movie={movie}
                  rank={i + 1}
                  onDismiss={handleDismiss}
                  onToggleShortlist={onToggleShortlist}
                  isShortlisted={shortlistSet.has(movie.tmdbId)}
                  pickerMediaStatus={pickerStatusByTmdb[movie.tmdbId]}
                  onPickerStatusesInvalidate={onPickerStatusesInvalidate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
