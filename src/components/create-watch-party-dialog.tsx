"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Friend = { id: string; name: string; avatarUrl: string | null };
type FriendsResponse = { friends: Friend[] };

interface CreateWatchPartyDialogProps {
  tmdbId: number;
  mediaType: "MOVIE" | "TV";
  title: string;
  /** Pre-selected friend IDs (e.g. from Picker participants). */
  preselectedInviteeIds?: string[];
  /** Picker session ID to link. */
  pickerSessionId?: string;
  /** Pre-fill the date field — YYYY-MM-DD format. */
  defaultScheduledFor?: string;
  trigger?: React.ReactNode;
}

export function CreateWatchPartyDialog({
  tmdbId,
  mediaType,
  title,
  preselectedInviteeIds = [],
  pickerSessionId,
  defaultScheduledFor,
  trigger,
}: CreateWatchPartyDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preselectedInviteeIds),
  );
  const [scheduledFor, setScheduledFor] = useState(
    defaultScheduledFor ? `${defaultScheduledFor}T19:00` : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load friends once when dialog opens; preselectedInviteeIds is intentionally
  // excluded from deps — it's an array default that changes reference every render.
  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    void (async () => {
      setLoadingFriends(true);
      try {
        const r = await fetch("/api/friends", { signal: ac.signal });
        const data = (await r.json()) as FriendsResponse;
        if (!ac.signal.aborted) {
          setFriends(data.friends ?? []);
        }
      } catch {
        // ignore abort errors
      } finally {
        if (!ac.signal.aborted) setLoadingFriends(false);
      }
    })();
    return () => ac.abort();
  }, [open]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!scheduledFor) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/watch-parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          mediaType,
          scheduledFor: new Date(scheduledFor).toISOString(),
          inviteeIds: Array.from(selectedIds),
          pickerSessionId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Something went wrong");
        return;
      }
      const party = (await res.json()) as { id: string };
      setOpen(false);
      router.push(`/watch-parties/${party.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <PartyPopper className="h-4 w-4" />
            Watch Party
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a Watch Party</DialogTitle>
          <DialogDescription>
            Invite friends to watch <strong>{title}</strong> together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date & time */}
          <div className="space-y-1.5">
            <Label htmlFor="wp-datetime">Date & time</Label>
            <Input
              id="wp-datetime"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>

          {/* Friend picker */}
          <div className="space-y-1.5">
            <Label>Invite friends</Label>
            {loadingFriends ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading friends…
              </div>
            ) : friends.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                You don&apos;t have any friends on Screened yet — you can still
                create the party and invite people later.
              </p>
            ) : (
              <div className="space-y-1 max-h-52 overflow-y-auto rounded-md border border-border p-1">
                {friends.map((f) => {
                  const selected = selectedIds.has(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggle(f.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded px-2 py-2 text-sm transition-colors",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={f.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {f.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-left font-medium">
                        {f.name}
                      </span>
                      {selected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedIds.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedIds.size} friend{selectedIds.size !== 1 ? "s" : ""}{" "}
                selected
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !scheduledFor}
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PartyPopper className="h-4 w-4" />
            )}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
