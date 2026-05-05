export default function UpcomingLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
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
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <div className="w-7 h-10 rounded bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-4 w-16 rounded bg-muted animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
