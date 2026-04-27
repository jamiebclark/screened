import { Skeleton } from "@/components/ui/skeleton";

function ListCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Image strip */}
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function ListsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Section header + create button */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* My lists grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <ListCardSkeleton key={i} />
        ))}
      </div>

      {/* Discover section */}
      <Skeleton className="h-6 w-24 mt-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <ListCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
