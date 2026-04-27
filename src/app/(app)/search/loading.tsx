import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Search input skeleton */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2">
        {["All", "Movies", "TV"].map((label) => (
          <Skeleton key={label} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        {Array.from({ length: 21 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
