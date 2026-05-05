import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Month groups */}
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="space-y-3 mb-8">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
