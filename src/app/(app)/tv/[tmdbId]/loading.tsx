import { Skeleton } from "@/components/ui/skeleton";

export default function TvLoading() {
  return (
    <div>
      {/* Backdrop */}
      <Skeleton className="w-full h-64 sm:h-80 rounded-none" />

      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex flex-col sm:flex-row gap-6 -mt-24 relative z-10">
          {/* Poster */}
          <Skeleton className="hidden sm:block shrink-0 w-36 md:w-48 aspect-[2/3] rounded-lg" />

          {/* Info */}
          <div className="flex-1 pt-2 sm:pt-16 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/4 max-w-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
