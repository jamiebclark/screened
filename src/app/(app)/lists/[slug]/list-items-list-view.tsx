"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageSquare, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListItemVotePill } from "./list-item-vote-pill";
import { MarkdownContent } from "@/components/markdown-content";
import { tmdbImageUrl } from "@/lib/utils";
import type { GridItem } from "./list-items-grid";

interface ListItemsListViewProps {
  items: GridItem[];
  listSlug: string;
  canVote: boolean;
  currentUserId: string | undefined;
  rankingEnabled: boolean;
  canReorder: boolean;
  onSelect: (id: string) => void;
}

function SpoilerNote({ notes }: { notes: string }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) {
    return (
      <div className="line-clamp-2">
        <MarkdownContent content={notes} />
      </div>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setRevealed(true);
      }}
      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-500 transition-colors"
    >
      <Eye className="h-3 w-3" />
      Spoiler — reveal
    </button>
  );
}

function ListRow({
  item,
  listSlug,
  canVote,
  currentUserId,
  rankingEnabled,
  onSelect,
}: {
  item: GridItem;
  listSlug: string;
  canVote: boolean;
  currentUserId: string | undefined;
  rankingEnabled: boolean;
  onSelect: (id: string) => void;
}) {
  const posterUrl = tmdbImageUrl(item.mediaItem.poster, "w92");
  const upvotes = item.votes.filter((v) => v.value === 1).length;
  const downvotes = item.votes.filter((v) => v.value === -1).length;
  const userVote = currentUserId
    ? (item.votes.find((v) => v.userId === currentUserId)?.value ?? null)
    : null;

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => onSelect(item.id)}
    >
      {/* Rank number */}
      {rankingEnabled && item.position !== undefined && (
        <div className="w-7 shrink-0 flex items-center justify-center pt-1">
          <span className="text-sm font-bold text-muted-foreground tabular-nums">
            {item.position}
          </span>
        </div>
      )}

      {/* Poster thumbnail */}
      <div className="shrink-0 w-10 h-[60px] rounded overflow-hidden bg-muted">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={item.mediaItem.title}
            width={40}
            height={60}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[8px] text-muted-foreground text-center px-1">
              {item.mediaItem.title}
            </span>
          </div>
        )}
      </div>

      {/* Title + meta + avatar */}
      <div className="w-36 sm:w-44 shrink-0 min-w-0">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {item.mediaItem.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {item.mediaItem.year}
          {item.mediaItem.year && " · "}
          {item.mediaItem.type === "movie" ? "Movie" : "TV"}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Avatar className="h-4 w-4 shrink-0">
            <AvatarImage src={item.addedBy.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[8px]">
              {item.addedBy.name?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground truncate">
            {item.addedBy.name}
          </span>
        </div>
      </div>

      {/* Note — right-side column */}
      <div className="flex-1 min-w-0 hidden sm:block">
        {item.notes &&
          (item.noteIsSpoiler ? (
            <SpoilerNote notes={item.notes} />
          ) : (
            <div className="line-clamp-3">
              <MarkdownContent content={item.notes} />
            </div>
          ))}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        {canVote && (
          <div onClick={(e) => e.stopPropagation()}>
            <ListItemVotePill
              listSlug={listSlug}
              itemId={item.id}
              upvotes={upvotes}
              downvotes={downvotes}
              userVote={userVote}
              canVote={canVote}
            />
          </div>
        )}
        {item.commentCount > 0 && (
          <div
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              item.unreadCommentCount > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <MessageSquare className="h-2.5 w-2.5" />
            {item.unreadCommentCount > 0
              ? item.unreadCommentCount
              : item.commentCount}
          </div>
        )}
      </div>
    </div>
  );
}

export function ListItemsListView({
  items,
  listSlug,
  canVote,
  currentUserId,
  rankingEnabled,
  onSelect,
}: ListItemsListViewProps) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <ListRow
          key={item.id}
          item={item}
          listSlug={listSlug}
          canVote={canVote}
          currentUserId={currentUserId}
          rankingEnabled={rankingEnabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
