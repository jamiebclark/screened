"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { HiddenFilter } from "@/lib/list-view-params";

export function ListHiddenFilter({
  hiddenFilter,
}: {
  hiddenFilter: HiddenFilter;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = hiddenFilter === "exclude";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (active) {
      params.delete("hidden");
    } else {
      params.set("hidden", "exclude");
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={active}
      className={cn(
        "text-xs px-2.5 py-1 rounded-full border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
      )}
    >
      Hide hidden items
    </button>
  );
}
