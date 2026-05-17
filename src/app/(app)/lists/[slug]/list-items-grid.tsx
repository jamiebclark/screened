"use client";

import { useState } from "react";
import { Film, Tv, MessageSquare } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListItemVotePill } from "./list-item-vote-pill";
import { ListItemModal } from "./list-item-modal";

export type GridItem = {
  id: string;
  notes: string | null;
  addedAt: string;
  canDelete: boolean;
  commentCount: number;
  unreadCommentCount: number;
  addedBy: { id: string; name: string | null; avatarUrl: string | null };
  mediaItem: {
    tmdbId: number;
    type: "movie" | "tv";
    title: string;
    poster: string | null;
    year: number | null;
    overview: string | null;
    runtime: number | null;
    genres: string[];
  };
  votes: { value: number; userId: string }[];
  watchedBy: { id: string; name: string | null; avatarUrl: string | null }[];
  watchingBy: { id: string; name: string | null; avatarUrl: string | null }[];
};

interface ListItemsGridProps {
  movies: GridItem[];
  tvShows: GridItem[];
  watchedMovies: GridItem[];
  watchedTv: GridItem[];
  listSlug: string;
  canVote: boolean;
  currentUserId: string | undefined;
  isListOwner: boolean;
}

function SectionGrid({
  items,
  listSlug,
  canVote,
  currentUserId,
  onSelect,
}: {
  items: GridItem[];
  listSlug: string;
  canVote: boolean;
  currentUserId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        const upvotes = item.votes.filter((v) => v.value === 1).length;
        const downvotes = item.votes.filter((v) => v.value === -1).length;
        const userVote = currentUserId
          ? (item.votes.find((v) => v.userId === currentUserId)?.value ?? null)
          : null;

        return (
          <div key={item.id} className="relative">
            <MediaCard
              tmdbId={item.mediaItem.tmdbId}
              type={item.mediaItem.type}
              title={item.mediaItem.title}
              poster={item.mediaItem.poster}
              year={item.mediaItem.year}
              compact
              onClick={() => onSelect(item.id)}
            />

            {/* Added-by avatar — top left */}
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <Avatar className="h-6 w-6 border-2 border-background shadow-sm">
                <AvatarImage src={item.addedBy.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[9px]">
                  {item.addedBy.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Vote pill — top right, always visible */}
            <div className="absolute top-2 right-2 z-10">
              <ListItemVotePill
                listSlug={listSlug}
                itemId={item.id}
                upvotes={upvotes}
                downvotes={downvotes}
                userVote={userVote}
                canVote={canVote}
              />
            </div>

            {/* Comment badge — bottom right */}
            {item.commentCount > 0 && (
              <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
                <div
                  className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium shadow-sm ${
                    item.unreadCommentCount > 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-black/60 text-white"
                  }`}
                >
                  <MessageSquare className="h-2.5 w-2.5" />
                  {item.unreadCommentCount > 0
                    ? item.unreadCommentCount
                    : item.commentCount}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ListItemsGrid({
  movies,
  tvShows,
  watchedMovies,
  watchedTv,
  listSlug,
  canVote,
  currentUserId,
  isListOwner,
}: ListItemsGridProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const allItems = [...movies, ...tvShows, ...watchedMovies, ...watchedTv];
  const selectedItem = selectedItemId
    ? (allItems.find((i) => i.id === selectedItemId) ?? null)
    : null;

  const showWatched = watchedMovies.length > 0 || watchedTv.length > 0;
  const watchedCount = watchedMovies.length + watchedTv.length;

  const sectionProps = {
    listSlug,
    canVote,
    currentUserId,
    onSelect: setSelectedItemId,
  };

  return (
    <>
      <div className="space-y-8">
        {movies.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Film className="h-4 w-4" />
              Movies ({movies.length})
            </h2>
            <SectionGrid items={movies} {...sectionProps} />
          </section>
        )}

        {tvShows.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Tv className="h-4 w-4" />
              TV Shows ({tvShows.length})
            </h2>
            <SectionGrid items={tvShows} {...sectionProps} />
          </section>
        )}

        {showWatched && (
          <section>
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
              Watched ({watchedCount})
            </h2>
            <div className="space-y-8">
              {watchedMovies.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Film className="h-4 w-4" />
                    Movies ({watchedMovies.length})
                  </h3>
                  <SectionGrid items={watchedMovies} {...sectionProps} />
                </div>
              )}
              {watchedTv.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Tv className="h-4 w-4" />
                    TV Shows ({watchedTv.length})
                  </h3>
                  <SectionGrid items={watchedTv} {...sectionProps} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <ListItemModal
        item={selectedItem}
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItemId(null)}
        listSlug={listSlug}
        canVote={canVote}
        currentUserId={currentUserId}
        isListOwner={isListOwner}
      />
    </>
  );
}
