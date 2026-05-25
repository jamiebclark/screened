"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SearchUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string;
  plexConnection: { plexUsername: string } | null;
};

interface FindFriendsPanelProps {
  friendIds: string[];
  outgoingIds: string[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FindFriendsPanel({
  friendIds,
  outgoingIds,
}: FindFriendsPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set(outgoingIds));
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  const friendSet = new Set(friendIds);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      startTransition(() => {
        setResults([]);
        setDropdownOpen(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setIsSearching(true);
    });
    fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json() as Promise<SearchUser[]>)
      .then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setDropdownOpen(rows.length > 0);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setDropdownOpen(false);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const onAdd = async (toUserId: string) => {
    setActing(toUserId);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId }),
      });
      if (!res.ok) return;
      setSentIds((prev) => new Set([...prev, toUserId]));
      setQuery("");
      setResults([]);
      setDropdownOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setActing(null);
    }
  };

  function getStatus(userId: string): "friend" | "sent" | "none" {
    if (friendSet.has(userId)) return "friend";
    if (sentIds.has(userId)) return "sent";
    return "none";
  }

  const visibleResults =
    debouncedQuery.length >= 2
      ? results.length > 0
        ? results
        : !isSearching
          ? []
          : []
      : [];

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Find friends by name, email, or username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => visibleResults.length > 0 && setDropdownOpen(true)}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {dropdownOpen && debouncedQuery.length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md text-sm">
          {results.length === 0 && !isSearching && (
            <li className="px-3 py-2 text-muted-foreground">No users found</li>
          )}
          {results.map((u) => {
            const status = getStatus(u.id);
            return (
              <li key={u.id}>
                <div className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={u.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {u.name}
                  </span>
                  {status === "friend" && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Already friends
                    </span>
                  )}
                  {status === "sent" && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Request sent
                    </span>
                  )}
                  {status === "none" && (
                    <button
                      type="button"
                      className="shrink-0 rounded-sm p-1 hover:bg-accent disabled:opacity-50"
                      onClick={() => void onAdd(u.id)}
                      disabled={acting != null}
                      aria-label={`Add ${u.name} as friend`}
                    >
                      {acting === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
