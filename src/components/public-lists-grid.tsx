"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ListCard, type ListCardData } from "./list-card";

const INITIAL_COUNT = 6;

export function PublicListsGrid({ lists }: { lists: ListCardData[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? lists : lists.slice(0, INITIAL_COUNT);
  const remaining = lists.length - INITIAL_COUNT;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {visible.map((list) => (
          <ListCard key={list.id} list={list} />
        ))}
      </div>
      {!expanded && remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="h-4 w-4" />
          Show {remaining} more
        </button>
      )}
    </div>
  );
}
