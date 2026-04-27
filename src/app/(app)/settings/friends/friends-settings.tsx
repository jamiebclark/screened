"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UserBrief = { id: string; name: string; avatarUrl: string | null };

type SearchUser = UserBrief & {
  email: string;
  plexConnection: { plexUsername: string } | null;
};

interface ApiFriends {
  friends: UserBrief[];
  outgoing: { id: string; toUser: UserBrief; createdAt: string }[];
  incoming: { id: string; fromUser: UserBrief; createdAt: string }[];
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

export function FriendsSettings() {
  const router = useRouter();
  const [data, setData] = useState<ApiFriends | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/friends");
    if (!res.ok) {
      setLoadError("Could not load friends");
      return;
    }
    setData((await res.json()) as ApiFriends);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      startTransition(() => {
        setResults([]);
        setDropdownOpen(false);
      });
      return;
    }
    setIsSearching(true);
    fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json() as Promise<SearchUser[]>)
      .then((rows) => {
        setResults(rows);
        setDropdownOpen(rows.length > 0);
      })
      .catch(() => {
        setResults([]);
        setDropdownOpen(false);
      })
      .finally(() => setIsSearching(false));
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
    setActing(`add-${toUserId}`);
    setDropdownOpen(false);
    setQuery("");
    setResults([]);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId }),
      });
      if (!res.ok) {
        return;
      }
      await load();
      router.refresh();
    } finally {
      setActing(null);
    }
  };

  const onAccept = async (requestId: string) => {
    setActing(`acc-${requestId}`);
    try {
      const res = await fetch(
        `/api/friends/requests/${encodeURIComponent(requestId)}/accept`,
        { method: "POST" },
      );
      if (!res.ok) return;
      await load();
      router.refresh();
    } finally {
      setActing(null);
    }
  };

  const onDeleteRequest = async (requestId: string) => {
    setActing(`del-${requestId}`);
    try {
      const res = await fetch(
        `/api/friends/requests/${encodeURIComponent(requestId)}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) return;
      await load();
      router.refresh();
    } finally {
      setActing(null);
    }
  };

  const onUnfriend = async (userId: string) => {
    setActing(`un-${userId}`);
    try {
      const res = await fetch(`/api/friends/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      await load();
      router.refresh();
    } finally {
      setActing(null);
    }
  };

  const friendIds = new Set(data?.friends.map((f) => f.id) ?? []);
  const outgoingIds = new Set(data?.outgoing.map((o) => o.toUser.id) ?? []);
  const searchFiltered = results.filter(
    (u) => !friendIds.has(u.id) && !outgoingIds.has(u.id),
  );

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add a friend</CardTitle>
          <CardDescription>
            Search by name, email, or Plex username. You can also send a request
            from someone’s profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="relative max-w-md">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search people…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() =>
                    searchFiltered.length > 0 && setDropdownOpen(true)
                  }
                  autoComplete="off"
                />
              </div>
            </div>
            {dropdownOpen &&
              (searchFiltered.length > 0 ||
                (isSearching && query.length >= 2)) && (
                <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md text-sm">
                  {isSearching && searchFiltered.length === 0 && (
                    <li className="px-2 py-2 text-muted-foreground">
                      Searching…
                    </li>
                  )}
                  {searchFiltered.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                        onClick={() => void onAdd(u.id)}
                        disabled={acting != null}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={u.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{u.name}</span>
                        <UserPlus className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      )}

      {data && data.incoming.length > 0 && (
        <section aria-labelledby="incoming-heading">
          <h2 id="incoming-heading" className="text-lg font-semibold mb-3">
            Requests for you
          </h2>
          <ul className="space-y-2">
            {data.incoming.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <Link
                  href={`/profile/${r.fromUser.id}`}
                  className="flex items-center gap-2 min-w-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={r.fromUser.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials(r.fromUser.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate hover:underline">
                    {r.fromUser.name}
                  </span>
                </Link>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onDeleteRequest(r.id)}
                    disabled={acting != null}
                  >
                    {acting === `del-${r.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    <span className="sr-only">Decline</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void onAccept(r.id)}
                    disabled={acting != null}
                  >
                    {acting === `acc-${r.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="ml-1">Accept</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.outgoing.length > 0 && (
        <section aria-labelledby="out-heading">
          <h2 id="out-heading" className="text-lg font-semibold mb-3">
            Pending
          </h2>
          <ul className="space-y-2">
            {data.outgoing.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <Link
                  href={`/profile/${r.toUser.id}`}
                  className="flex items-center gap-2 min-w-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={r.toUser.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials(r.toUser.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate hover:underline">
                    {r.toUser.name}
                  </span>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onDeleteRequest(r.id)}
                  disabled={acting != null}
                >
                  {acting === `del-${r.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cancel"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.friends.length > 0 && (
        <section aria-labelledby="friends-heading">
          <h2 id="friends-heading" className="text-lg font-semibold mb-3">
            Friends
          </h2>
          <ul className="space-y-2">
            {data.friends.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <Link
                  href={`/profile/${f.id}`}
                  className="flex items-center gap-2 min-w-0"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={f.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials(f.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate hover:underline">
                    {f.name}
                  </span>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void onUnfriend(f.id)}
                  disabled={acting != null}
                >
                  {acting === `un-${f.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Unfriend"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data &&
        data.friends.length === 0 &&
        data.incoming.length === 0 &&
        data.outgoing.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You have not added any friends yet.
          </p>
        )}
    </div>
  );
}
