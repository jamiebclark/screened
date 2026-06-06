"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MediaCard } from "@/components/media-card";
import type { ReleaseItem } from "@/lib/releases-queries";

function offsetMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function monthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthLastDay(year: number, month: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

function formatDay(dateStr: string) {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

type Section = {
  key: string;
  year: number;
  month: number;
  label: string;
  items: ReleaseItem[];
};

function groupByMonth(items: ReleaseItem[]): Section[] {
  const map = new Map<string, Section>();
  for (const item of items) {
    const [y, m] = item.releaseDate.split("-").map(Number);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        year: y,
        month: m,
        label: monthLabel(y, m),
        items: [],
      });
    }
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );
}

type Props = {
  initialItems: ReleaseItem[];
  initialHasMore: boolean;
  fromDate: string; // YYYY-MM-DD, first of current month — used for all forward loads
};

export function ReleasesFeed({
  initialItems,
  initialHasMore,
  fromDate,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [nextPage, setNextPage] = useState(4);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingNext, setLoadingNext] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const [prev, setPrev] = useState(() => {
    const year = parseInt(fromDate.slice(0, 4), 10);
    const month = parseInt(fromDate.slice(5, 7), 10);
    return offsetMonth(year, month, -1);
  });

  const sections = useMemo(() => groupByMonth(items), [items]);

  const loadNext = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return;
    fetchingRef.current = true;
    setLoadingNext(true);
    try {
      const res = await fetch(
        `/api/releases?fromDate=${fromDate}&page=${nextPage}`,
      );
      if (!res.ok) return;
      const data: { items: ReleaseItem[]; hasMore: boolean } = await res.json();
      setItems((current) => {
        const seen = new Set(current.map((i) => i.tmdbId));
        return [...current, ...data.items.filter((i) => !seen.has(i.tmdbId))];
      });
      setNextPage((p) => p + 3);
      setHasMore(data.hasMore);
    } finally {
      fetchingRef.current = false;
      setLoadingNext(false);
    }
  }, [fromDate, nextPage, hasMore]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadNext();
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadNext, hasMore]);

  const loadPrev = async () => {
    if (loadingPrev) return;
    setLoadingPrev(true);
    const prevFromDate = `${prev.year}-${String(prev.month).padStart(2, "0")}-01`;
    const prevToDate = monthLastDay(prev.year, prev.month);
    try {
      const res = await fetch(
        `/api/releases?fromDate=${prevFromDate}&page=1&toDate=${prevToDate}`,
      );
      if (!res.ok) return;
      const data: { items: ReleaseItem[] } = await res.json();
      setItems((current) => {
        const seen = new Set(current.map((i) => i.tmdbId));
        return [...data.items.filter((i) => !seen.has(i.tmdbId)), ...current];
      });
      setPrev((p) => offsetMonth(p.year, p.month, -1));
    } finally {
      setLoadingPrev(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-center">
        <button
          onClick={loadPrev}
          disabled={loadingPrev}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {loadingPrev ? "Loading…" : `← ${monthLabel(prev.year, prev.month)}`}
        </button>
      </div>

      {sections.map(({ key, label, items: sectionItems }) => (
        <section key={key}>
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            {label}
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {sectionItems.length}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {sectionItems.map((item) => (
              <div key={item.tmdbId} className="space-y-1.5">
                <MediaCard
                  tmdbId={item.tmdbId}
                  type="movie"
                  title={item.title}
                  poster={item.poster}
                  year={parseInt(item.releaseDate.slice(0, 4), 10)}
                  onList={item.onList}
                />
                <p className="text-xs text-muted-foreground text-center truncate">
                  {formatDay(item.releaseDate)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {hasMore ? (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingNext && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          No more upcoming releases found.
        </p>
      )}
    </div>
  );
}
