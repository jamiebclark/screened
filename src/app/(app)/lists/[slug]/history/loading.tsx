import { Skeleton } from "@/components/ui/skeleton";

export default function ListHistoryLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-24" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-40" />

      <div className="mt-8 space-y-6">
        {Array.from({ length: 3 }).map((_, groupIdx) => (
          <div key={groupIdx}>
            <Skeleton className="mb-3 h-4 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, rowIdx) => (
                <Skeleton key={rowIdx} className="h-[60px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
