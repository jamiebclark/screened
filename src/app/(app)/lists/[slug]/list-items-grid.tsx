"use client";

import { useState } from "react";
import { Film, Tv } from "lucide-react";
import { MediaCard } from "@/components/media-card";
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
      {items.map((item) => (
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
          <div className="mt-1.5">
            <p className="text-sm font-medium line-clamp-1">
              {item.mediaItem.title}
            </p>
            {item.mediaItem.year && (
              <p className="text-xs text-muted-foreground">
                {item.mediaItem.year}
              </p>
            )}
          </div>
        </div>
      ))}
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
