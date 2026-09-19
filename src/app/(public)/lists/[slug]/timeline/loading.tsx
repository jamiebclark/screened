import { Skeleton } from "@/components/ui/skeleton";

export default function ListTimelineLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-24" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-40" />

      <ol className="mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex">
            <div className="w-16 shrink-0 pr-3 pt-3 sm:w-24">
              <Skeleton className="ml-auto h-3 w-8" />
              <Skeleton className="ml-auto mt-1 h-3 w-12" />
            </div>
            <div className="min-w-0 flex-1 border-l pb-3 pl-4">
              <Skeleton className="h-[86px] w-full rounded-lg" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
