"use client";

import { useState } from "react";
import { Film, Tv, ThumbsUp, ThumbsDown } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ListItemModal } from "./list-item-modal";

export type GridItem = {
  id: string;
  notes: string | null;
  addedAt: string;
  canDelete: boolean;
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
}

function SectionGrid({
  items,
  onSelect,
}: {
  items: GridItem[];
  onSelect: (item: GridItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        const upvotes = item.votes.filter((v) => v.value === 1).length;
        const downvotes = item.votes.filter((v) => v.value === -1).length;
        const hasVotes = upvotes > 0 || downvotes > 0;

        return (
          <div key={item.id} className="relative">
            <MediaCard
              tmdbId={item.mediaItem.tmdbId}
              type={item.mediaItem.type}
              title={item.mediaItem.title}
              poster={item.mediaItem.poster}
              year={item.mediaItem.year}
              compact
              onClick={() => onSelect(item)}
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

            {/* Vote counts — top right */}
            {hasVotes && (
              <div className="absolute top-2 right-2 z-10 pointer-events-none flex items-center gap-1">
                {upvotes > 0 && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium",
                      downvotes === 0 ? "text-green-400" : "text-white",
                    )}
                  >
                    <ThumbsUp className="h-2.5 w-2.5" />
                    {upvotes}
                  </span>
                )}
                {downvotes > 0 && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium",
                      upvotes === 0 ? "text-red-400" : "text-white",
                    )}
                  >
                    <ThumbsDown className="h-2.5 w-2.5" />
                    {downvotes}
                  </span>
                )}
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
}: ListItemsGridProps) {
  const [selectedItem, setSelectedItem] = useState<GridItem | null>(null);

  const showWatched = watchedMovies.length > 0 || watchedTv.length > 0;
  const watchedCount = watchedMovies.length + watchedTv.length;

  return (
    <>
      <div className="space-y-8">
        {movies.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Film className="h-4 w-4" />
              Movies ({movies.length})
            </h2>
            <SectionGrid items={movies} onSelect={setSelectedItem} />
          </section>
        )}

        {tvShows.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Tv className="h-4 w-4" />
              TV Shows ({tvShows.length})
            </h2>
            <SectionGrid items={tvShows} onSelect={setSelectedItem} />
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
                  <SectionGrid
                    items={watchedMovies}
                    onSelect={setSelectedItem}
                  />
                </div>
              )}
              {watchedTv.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Tv className="h-4 w-4" />
                    TV Shows ({watchedTv.length})
                  </h3>
                  <SectionGrid items={watchedTv} onSelect={setSelectedItem} />
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <ListItemModal
        item={selectedItem}
        isOpen={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        listSlug={listSlug}
        canVote={canVote}
        currentUserId={currentUserId}
      />
    </>
  );
}
