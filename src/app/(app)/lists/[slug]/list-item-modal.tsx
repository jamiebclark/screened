"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ListItemVoteControls } from "./list-item-vote-controls";
import { ListItemDeleteButton } from "./list-item-delete-button";
import { ListItemComments } from "./list-item-comments";
import { tmdbImageUrl } from "@/lib/utils";
import type { GridItem } from "./list-items-grid";

interface ListItemModalProps {
  item: GridItem | null;
  isOpen: boolean;
  onClose: () => void;
  listSlug: string;
  canVote: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  currentUserId: string | undefined;
  isListOwner: boolean;
}

function SpoilerNote({
  notes,
  isSpoiler,
}: {
  notes: string;
  isSpoiler: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  if (!isSpoiler) return <p className="text-sm">{notes}</p>;
  if (revealed) return <p className="text-sm">{notes}</p>;
  return (
    <button
      onClick={() => setRevealed(true)}
      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-500 transition-colors"
    >
      <Eye className="h-3 w-3" />
      Spoiler — reveal
    </button>
  );
}

export function ListItemModal({
  item,
  isOpen,
  onClose,
  listSlug,
  canVote,
  votingEnabled,
  commentsEnabled,
  currentUserId,
  isListOwner,
}: ListItemModalProps) {
  if (!item) return null;

  const { mediaItem } = item;
  const type = mediaItem.type;
  const href = `/${type === "movie" ? "movies" : "tv"}/${mediaItem.tmdbId}`;
  const posterUrl = tmdbImageUrl(mediaItem.poster, "w342");
  const upvotes = item.votes.filter((v) => v.value === 1).length;
  const downvotes = item.votes.filter((v) => v.value === -1).length;
  const userVote = currentUserId
    ? (item.votes.find((v) => v.userId === currentUserId)?.value ?? null)
    : null;

  const runtimeLabel = mediaItem.runtime
    ? `${Math.floor(mediaItem.runtime / 60)}h ${mediaItem.runtime % 60}m`
    : null;

  const addedDate = new Date(item.addedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">{mediaItem.title}</DialogTitle>
        <div className="flex flex-col sm:flex-row">
          {/* Poster */}
          <div className="sm:w-48 shrink-0">
            {posterUrl ? (
              <div className="relative aspect-[2/3] sm:h-full w-full">
                <Image
                  src={posterUrl}
                  alt={mediaItem.title}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </div>
            ) : (
              <div className="aspect-[2/3] sm:h-full bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground text-center px-2">
                  {mediaItem.title}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 p-5 overflow-y-auto max-h-[80vh] space-y-4">
            {/* Title + meta */}
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                <Link href={href} className="hover:underline" onClick={onClose}>
                  {mediaItem.title}
                </Link>
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
                {mediaItem.year && <span>{mediaItem.year}</span>}
                <span>·</span>
                <span>{type === "movie" ? "Movie" : "TV Show"}</span>
                {runtimeLabel && (
                  <>
                    <span>·</span>
                    <span>{runtimeLabel}</span>
                  </>
                )}
              </div>
              {mediaItem.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {mediaItem.genres.map((g) => (
                    <Link
                      key={g}
                      href={`/browse?genreName=${encodeURIComponent(g)}&type=${type}`}
                      onClick={onClose}
                      className="inline-flex items-center rounded-full border border-transparent bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Overview */}
            {mediaItem.overview && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                {mediaItem.overview}
              </p>
            )}

            <div className="border-t border-border" />

            {/* Votes */}
            {votingEnabled && canVote && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Vote:</span>
                <ListItemVoteControls
                  listSlug={listSlug}
                  itemId={item.id}
                  upvotes={upvotes}
                  downvotes={downvotes}
                  userVote={userVote}
                />
              </div>
            )}
            {votingEnabled && !canVote && (upvotes > 0 || downvotes > 0) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> {upvotes}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-3 w-3" /> {downvotes}
                </span>
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Notes
                </p>
                <SpoilerNote
                  notes={item.notes}
                  isSpoiler={item.noteIsSpoiler}
                />
              </div>
            )}

            {/* Added by */}
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={item.addedBy.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {item.addedBy.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                Added by{" "}
                <Link
                  href={`/profile/${item.addedBy.id}`}
                  className="hover:underline text-foreground"
                  onClick={onClose}
                >
                  {item.addedBy.name}
                </Link>{" "}
                · {addedDate}
              </span>
            </div>

            {/* Member watch status */}
            {item.watchedBy.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Watched:</span>
                <div className="flex -space-x-1">
                  {item.watchedBy.map((m) => (
                    <Avatar
                      key={m.id}
                      className="h-5 w-5 border border-background"
                      title={m.name ?? undefined}
                    >
                      <AvatarImage src={m.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {m.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}
            {item.watchingBy.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Watching:</span>
                <div className="flex -space-x-1">
                  {item.watchingBy.map((m) => (
                    <Avatar
                      key={m.id}
                      className="h-5 w-5 border border-background"
                      title={m.name ?? undefined}
                    >
                      <AvatarImage src={m.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {m.name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}

            {commentsEnabled && (
              <>
                <div className="border-t border-border" />

                {/* Comments */}
                <ListItemComments
                  listSlug={listSlug}
                  itemId={item.id}
                  currentUserId={currentUserId}
                  isListOwner={isListOwner}
                  canComment={canVote}
                />
              </>
            )}

            <div className="border-t border-border" />

            {/* Actions */}
            {item.canDelete && (
              <ListItemDeleteButton
                itemId={item.id}
                listSlug={listSlug}
                onDeleted={onClose}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
