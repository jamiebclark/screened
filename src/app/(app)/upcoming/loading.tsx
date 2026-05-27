export default function UpcomingLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-7 w-28 rounded bg-muted animate-pulse" />
          <div className="h-4 w-44 rounded bg-muted animate-pulse" />
        </div>
      </div>

      {[1, 2].map((section) => (
        <div key={section} className="space-y-3">
          <div className="h-5 w-28 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
                <div className="h-3 w-3/4 mx-auto rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
