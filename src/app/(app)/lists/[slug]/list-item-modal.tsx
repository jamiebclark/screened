"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown, Eye, Pencil, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MarkdownEditor } from "@/components/markdown-editor";
import { ListItemVoteControls } from "./list-item-vote-controls";
import { ListItemDeleteButton } from "./list-item-delete-button";
import { ListItemComments } from "./list-item-comments";
import { tmdbImageUrl } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";
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
  onNoteSaved?: (
    itemId: string,
    note: string | null,
    isSpoiler: boolean,
  ) => void;
}

function NoteDisplay({
  notes,
  isSpoiler,
}: {
  notes: string;
  isSpoiler: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  if (!isSpoiler) return <MarkdownContent content={notes} />;
  if (revealed) return <MarkdownContent content={notes} />;
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

function NoteSection({
  initialNote,
  initialIsSpoiler,
  itemId,
  listSlug,
  canEdit,
  overview,
  onSaved,
}: {
  initialNote: string | null;
  initialIsSpoiler: boolean;
  itemId: string;
  listSlug: string;
  canEdit: boolean;
  overview: string | null;
  onSaved?: (note: string | null, isSpoiler: boolean) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState(initialNote ?? "");
  const [isSpoiler, setIsSpoiler] = useState(initialIsSpoiler);
  const [displayNote, setDisplayNote] = useState(initialNote);
  const [displayIsSpoiler, setDisplayIsSpoiler] = useState(initialIsSpoiler);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/lists/${listSlug}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: noteText.trim() || null,
          noteIsSpoiler: noteText.trim() ? isSpoiler : false,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(j.error ?? "Failed to save");
        return;
      }
      const savedNote = noteText.trim() || null;
      const savedIsSpoiler = noteText.trim() ? isSpoiler : false;
      setDisplayNote(savedNote);
      setDisplayIsSpoiler(savedIsSpoiler);
      setEditing(false);
      onSaved?.(savedNote, savedIsSpoiler);
      router.refresh();
    } catch {
      setSaveError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNoteText(displayNote ?? "");
    setIsSpoiler(displayIsSpoiler);
    setSaveError(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <MarkdownEditor
          value={noteText}
          onChange={setNoteText}
          placeholder="Why are you adding this? Any thoughts…"
          height={180}
          autoFocus
        />
        {noteText.trim() && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox
              checked={isSpoiler}
              onCheckedChange={(v) => setIsSpoiler(v === true)}
            />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Mark note as spoiler
            </span>
          </label>
        )}
        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {displayNote ? (
        <div className="space-y-1">
          <NoteDisplay notes={displayNote} isSpoiler={displayIsSpoiler} />
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit note
            </button>
          )}
        </div>
      ) : (
        <div>
          {overview && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
              {overview}
            </p>
          )}
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Add note
            </button>
          )}
        </div>
      )}
    </div>
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
  onNoteSaved,
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

            {/* Note / overview */}
            <NoteSection
              initialNote={item.notes}
              initialIsSpoiler={item.noteIsSpoiler}
              itemId={item.id}
              listSlug={listSlug}
              canEdit={
                !!currentUserId &&
                (isListOwner || item.addedBy.id === currentUserId)
              }
              overview={mediaItem.overview}
              onSaved={(note, isSpoiler) =>
                onNoteSaved?.(item.id, note, isSpoiler)
              }
            />

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
