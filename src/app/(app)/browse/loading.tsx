import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="h-8 w-24 mb-6" />

      {/* Type toggle + genre pills placeholders */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          {[80, 90, 48].map((w) => (
            <Skeleton
              key={w}
              className="h-7 rounded-full"
              style={{ width: w }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[88, 72, 96, 64, 80, 104, 72, 88, 64].map((w, i) => (
            <Skeleton
              key={i}
              className="h-7 rounded-full"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>

      {/* Poster grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        {Array.from({ length: 21 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-[2/3] w-full rounded-md" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
