"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ListStickyHeaderProps {
  name: string;
  canAdd: boolean;
  onAdd: () => void;
  onStats: () => void;
}

export function ListStickyHeader({
  name,
  canAdd,
  onAdd,
  onStats,
}: ListStickyHeaderProps) {
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting);
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} />
      {visible && (
        // A landmark with its own name, holding short button names. While this
        // bar is up both it and the header's actions are in the DOM and both
        // stay keyboard-reachable, so reusing the header's names would announce
        // two indistinguishable "Add item to list" buttons. The names here are
        // also deliberately NOT supersets of the header's: locators match on
        // substrings, so "Add item to list" must not also find this one.
        <div
          role="region"
          aria-label="Pinned list actions"
          className="fixed top-16 inset-x-0 z-30 h-12 border-b bg-background/95 backdrop-blur"
        >
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4">
            <span className="truncate text-sm font-semibold">{name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {canAdd && (
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onAdd}
                  aria-label="Add item"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onStats}
                aria-label="Stats"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
