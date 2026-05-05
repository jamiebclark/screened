import { Skeleton } from "@/components/ui/skeleton";

export default function PickLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filter form */}
      <div className="space-y-4 max-w-xl">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
