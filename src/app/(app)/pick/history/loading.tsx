import { Skeleton } from "@/components/ui/skeleton";

function PickerSessionSkeleton() {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-4">
        <div className="flex gap-1.5">
          <Skeleton className="w-10 h-15 rounded" />
          <Skeleton className="w-10 h-15 rounded" />
          <Skeleton className="w-10 h-15 rounded" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

export default function PickHistoryLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <PickerSessionSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
