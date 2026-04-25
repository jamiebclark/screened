"use client";

import {
  useState,
  useRef,
  useEffect,
  useTransition,
  useCallback,
  FormEvent,
} from "react";
import { UserPlus, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  plexConnection: { plexUsername: string } | null;
}

interface InviteMemberFormProps {
  slug: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function InviteMemberForm({ slug }: InviteMemberFormProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<SearchUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const debouncedQuery = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search users when query changes (and no user is selected yet)
  useEffect(() => {
    if (selected) return;
    if (debouncedQuery.length < 2) {
      setResults([]);
      setDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json() as Promise<SearchUser[]>)
      .then((data) => {
        setResults(data);
        setDropdownOpen(data.length > 0);
      })
      .catch(() => setResults([]))
      .finally(() => setIsSearching(false));
  }, [debouncedQuery, selected]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectUser = useCallback((user: SearchUser) => {
    setSelected(user);
    setQuery(user.name);
    setDropdownOpen(false);
    setResults([]);
    setError(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
  }, []);

  const resetForm = useCallback(() => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
    setError(null);
    setSuccess(null);
  }, []);

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // If a user was selected from the dropdown use their email,
    // otherwise treat the query as a typed email.
    const email = selected?.email ?? query.trim();
    if (!email) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/lists/${slug}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: "CONTRIBUTOR" }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? "Failed to invite");
          return;
        }

        const member = (await res.json()) as { user: { name: string } };
        // Reset form fields but keep the success message visible
        setSelected(null);
        setQuery("");
        setResults([]);
        setDropdownOpen(false);
        setError(null);
        setSuccess(`${member.user.name} has been added to the list`);
      } catch {
        setError("Something went wrong");
      }
    });
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite to list</DialogTitle>
        </DialogHeader>

        {success && (
          <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium leading-none" htmlFor="user-search">
              Search by name, username, or email
            </label>

            <div ref={containerRef} className="relative">
              {/* Input row */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="user-search"
                  autoComplete="off"
                  placeholder="Search users…"
                  value={query}
                  onChange={(e) => {
                    if (selected) clearSelection();
                    setQuery(e.target.value);
                  }}
                  onFocus={() => {
                    if (results.length > 0) setDropdownOpen(true);
                  }}
                  className="pl-9 pr-9"
                />
                {(query || selected) && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {isSearching && (
                  <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Selected user chip */}
              {selected && (
                <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selected.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {initials(selected.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{selected.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Dropdown results */}
              {dropdownOpen && results.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                  {results.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none first:rounded-t-md last:rounded-b-md"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectUser(user);
                        }}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={user.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {initials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.plexConnection?.plexUsername
                              ? `@${user.plexConnection.plexUsername} · `
                              : ""}
                            {user.email}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || (!selected && query.length < 3)}
            className="w-full"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Add to list
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
