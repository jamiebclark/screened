"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type SortField = "date_added" | "title" | "votes" | "release";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "date_added", label: "Date added" },
  { value: "votes", label: "Votes" },
  { value: "title", label: "Title" },
  { value: "release", label: "Release year" },
];

export function ListSortControls({
  currentSort,
  showVoteSort = true,
}: {
  currentSort: SortField;
  showVoteSort?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setSort(sort: SortField) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.push(`?${params.toString()}`);
  }

  const options = showVoteSort
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((o) => o.value !== "votes");

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      <span className="text-xs text-muted-foreground">Sort:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setSort(opt.value)}
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            currentSort === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
