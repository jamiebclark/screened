"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ListItemsListView } from "./list-items-list-view";
import { ListItemModal } from "./list-item-modal";
import type { GridItem } from "./list-items-grid";

interface ListItemReorderProps {
  items: GridItem[];
  listSlug: string;
  canVote: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  currentUserId: string | undefined;
  rankingEnabled: boolean;
  canReorder: boolean;
  isListOwner: boolean;
}

function SortableRow({
  item,
  canReorder,
  children,
}: {
  item: GridItem;
  canReorder: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start">
      {canReorder && (
        <button
          {...attributes}
          {...listeners}
          className="mt-3.5 mr-1 shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function ListItemReorder({
  items: initialItems,
  listSlug,
  canVote,
  votingEnabled,
  commentsEnabled,
  currentUserId,
  rankingEnabled,
  canReorder,
  isListOwner,
}: ListItemReorderProps) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = selectedItemId
    ? (items.find((i) => i.id === selectedItemId) ?? null)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      setItems(reordered);

      const positions = reordered.map((item, idx) => ({
        id: item.id,
        position: idx + 1,
      }));

      await fetch(`/api/lists/${listSlug}/items/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
      });
      router.refresh();
    },
    [items, listSlug, router],
  );

  const modal = (
    <ListItemModal
      item={selectedItem}
      isOpen={selectedItem !== null}
      onClose={() => setSelectedItemId(null)}
      listSlug={listSlug}
      canVote={canVote}
      votingEnabled={votingEnabled}
      commentsEnabled={commentsEnabled}
      currentUserId={currentUserId}
      isListOwner={isListOwner}
    />
  );

  if (!canReorder) {
    return (
      <>
        <ListItemsListView
          items={items}
          listSlug={listSlug}
          canVote={canVote}
          currentUserId={currentUserId}
          rankingEnabled={rankingEnabled}
          canReorder={false}
          onSelect={setSelectedItemId}
        />
        {modal}
      </>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-border">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} canReorder={canReorder}>
                <ListItemsListView
                  items={[item]}
                  listSlug={listSlug}
                  canVote={canVote}
                  currentUserId={currentUserId}
                  rankingEnabled={rankingEnabled}
                  canReorder={false}
                  onSelect={setSelectedItemId}
                />
              </SortableRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {modal}
    </>
  );
}
