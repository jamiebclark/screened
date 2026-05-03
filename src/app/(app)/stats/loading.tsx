import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-8 w-32 mb-8" />

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Genres + Ratings */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-2.5">
            {[...Array(8)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-2 w-full"
                style={{ opacity: 1 - i * 0.07 }}
              />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-5 w-20 mb-4" />
          <div className="space-y-2.5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-2 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Monthly activity */}
      <div className="mb-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-28 w-full" />
      </div>

      {/* Decades + Directors */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <Skeleton className="h-5 w-20 mb-4" />
          <div className="space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-2 w-full" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-5 w-20 mb-4" />
          <div className="space-y-1.5">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Cast */}
      <div>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-1.5">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
