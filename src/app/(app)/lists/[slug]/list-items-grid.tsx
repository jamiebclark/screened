"use client";

import { useState } from "react";
import { Film, Tv, MessageSquare } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListItemVotePill } from "./list-item-vote-pill";
import { ListItemModal } from "./list-item-modal";
import { ListItemHideToggle } from "./list-item-hide-toggle";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemTag } from "./list-item-tag-editor";
import type { TagVocabularyEntry } from "@/lib/list-item-tags";

export type GridItem = {
  id: string;
  notes: string | null;
  noteIsSpoiler: boolean;
  isHidden: boolean;
  position: number | null;
  displayRank?: number;
  addedAt: string;
  canDelete: boolean;
  commentCount: number;
  unreadCommentCount: number;
  addedBy: { id: string; name: string | null; avatarUrl: string | null };
  tags: ItemTag[];
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
  rankingEnabled: boolean;
  rankedItems: GridItem[];
  movies: GridItem[];
  tvShows: GridItem[];
  watchedMovies: GridItem[];
  watchedTv: GridItem[];
  listSlug: string;
  canVote: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  currentUserId: string | undefined;
  canCurate: boolean;
  isListOwner: boolean;
  tagVocabulary: TagVocabularyEntry[];
}

function SectionGrid({
  items,
  listSlug,
  canVote,
  votingEnabled,
  currentUserId,
  canCurate,
  onSelect,
  onHiddenChange,
}: {
  items: GridItem[];
  listSlug: string;
  canVote: boolean;
  votingEnabled: boolean;
  currentUserId: string | undefined;
  canCurate: boolean;
  onSelect: (id: string) => void;
  onHiddenChange: (id: string, isHidden: boolean) => void;
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
          <div
            key={item.id}
            className={cn("relative", item.isHidden && "opacity-50")}
          >
            <MediaCard
              tmdbId={item.mediaItem.tmdbId}
              type={item.mediaItem.type}
              title={item.mediaItem.title}
              poster={item.mediaItem.poster}
              year={item.mediaItem.year}
              onClick={() => onSelect(item.id)}
            />

            {item.isHidden && (
              <div className="absolute inset-x-0 top-1/2 z-10 flex justify-center pointer-events-none">
                <div className="rounded-full bg-black/70 text-white p-1.5 shadow-sm">
                  <EyeOff className="h-4 w-4" />
                </div>
              </div>
            )}

            {canCurate && (
              <div className="absolute bottom-2 left-2 z-10 rounded-full bg-black/60 text-white p-1.5 shadow-sm">
                <ListItemHideToggle
                  listSlug={listSlug}
                  itemId={item.id}
                  isHidden={item.isHidden}
                  onChange={(next) => onHiddenChange(item.id, next)}
                />
              </div>
            )}

            {/* Rank badge — top-left pill, ranked lists only */}
            {item.displayRank !== undefined && (
              <div className="absolute top-2 left-2 z-10 pointer-events-none rounded-full bg-black/70 text-white text-[11px] font-bold px-2 py-0.5 shadow-sm">
                {item.displayRank}
              </div>
            )}

            {/* Added-by avatar — top left */}
            {item.displayRank === undefined && (
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <Avatar className="h-6 w-6 border-2 border-background shadow-sm">
                  <AvatarImage src={item.addedBy.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[9px]">
                    {item.addedBy.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Vote pill — top right, only shown when voting is enabled */}
            {votingEnabled && (
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
            )}

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
  rankingEnabled,
  rankedItems,
  movies,
  tvShows,
  watchedMovies,
  watchedTv,
  listSlug,
  canVote,
  votingEnabled,
  commentsEnabled,
  currentUserId,
  canCurate,
  isListOwner,
  tagVocabulary,
}: ListItemsGridProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hiddenOverrides, setHiddenOverrides] = useState<
    Record<string, boolean>
  >({});
  const [tagOverrides, setTagOverrides] = useState<Record<string, ItemTag[]>>(
    {},
  );

  function applyOverride(item: GridItem): GridItem {
    const hiddenOverride = hiddenOverrides[item.id];
    const tagOverride = tagOverrides[item.id];
    return {
      ...item,
      isHidden: hiddenOverride === undefined ? item.isHidden : hiddenOverride,
      tags: tagOverride === undefined ? item.tags : tagOverride,
    };
  }

  function handleHiddenChange(id: string, isHidden: boolean) {
    setHiddenOverrides((prev) => ({ ...prev, [id]: isHidden }));
  }

  function handleTagsChange(id: string, tags: ItemTag[]) {
    setTagOverrides((prev) => ({ ...prev, [id]: tags }));
  }

  const rankedItemsView = rankedItems.map(applyOverride);
  const moviesView = movies.map(applyOverride);
  const tvShowsView = tvShows.map(applyOverride);
  const watchedMoviesView = watchedMovies.map(applyOverride);
  const watchedTvView = watchedTv.map(applyOverride);

  const allItems = rankingEnabled
    ? rankedItemsView
    : [...moviesView, ...tvShowsView, ...watchedMoviesView, ...watchedTvView];
  const selectedItem = selectedItemId
    ? (allItems.find((i) => i.id === selectedItemId) ?? null)
    : null;

  const showWatched = watchedMovies.length > 0 || watchedTv.length > 0;
  const watchedCount = watchedMovies.length + watchedTv.length;

  const sectionProps = {
    listSlug,
    canVote,
    votingEnabled,
    currentUserId,
    canCurate,
    onSelect: setSelectedItemId,
    onHiddenChange: handleHiddenChange,
  };

  if (rankingEnabled) {
    return (
      <>
        <SectionGrid items={rankedItemsView} {...sectionProps} />
        <ListItemModal
          item={selectedItem}
          isOpen={selectedItem !== null}
          onClose={() => setSelectedItemId(null)}
          listSlug={listSlug}
          canVote={canVote}
          votingEnabled={votingEnabled}
          commentsEnabled={commentsEnabled}
          currentUserId={currentUserId}
          canCurate={canCurate}
          isListOwner={isListOwner}
          onHiddenChanged={handleHiddenChange}
          tagVocabulary={tagVocabulary}
          onTagsChanged={handleTagsChange}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {movies.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Film className="h-4 w-4" />
              Movies ({movies.length})
            </h2>
            <SectionGrid items={moviesView} {...sectionProps} />
          </section>
        )}

        {tvShows.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Tv className="h-4 w-4" />
              TV Shows ({tvShows.length})
            </h2>
            <SectionGrid items={tvShowsView} {...sectionProps} />
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
                  <SectionGrid items={watchedMoviesView} {...sectionProps} />
                </div>
              )}
              {watchedTv.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Tv className="h-4 w-4" />
                    TV Shows ({watchedTv.length})
                  </h3>
                  <SectionGrid items={watchedTvView} {...sectionProps} />
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
        votingEnabled={votingEnabled}
        commentsEnabled={commentsEnabled}
        currentUserId={currentUserId}
        canCurate={canCurate}
        isListOwner={isListOwner}
        onHiddenChanged={handleHiddenChange}
        tagVocabulary={tagVocabulary}
        onTagsChanged={handleTagsChange}
      />
    </>
  );
}
