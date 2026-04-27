"use client";

import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Loader2 } from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export interface WatchEntry {
  id: string;
  watchedAt: string;
  review: string | null;
  rating: number | null;
  letterboxdActivityUrl?: string | null;
}

interface WatchEntryDialogProps {
  tmdbId: number;
  type: "movie" | "tv";
  entry?: WatchEntry;
  onSave: (entry: WatchEntry) => void;
  /** YYYY-MM-DD for new viewings only; pre-fills date & time (noon local). */
  defaultWatchedAtForNew?: string | null;
}

function toDatetimeLocal(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateOnlyToDatetimeLocal(ymd: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!parts) return toDatetimeLocal(new Date());
  const y = parseInt(parts[1], 10);
  const m = parseInt(parts[2], 10);
  const d = parseInt(parts[3], 10);
  const probe = new Date(y, m - 1, d);
  if (
    probe.getFullYear() !== y ||
    probe.getMonth() !== m - 1 ||
    probe.getDate() !== d
  ) {
    return toDatetimeLocal(new Date());
  }
  return toDatetimeLocal(new Date(y, m - 1, d, 12, 0, 0, 0));
}

export function WatchEntryDialog({
  tmdbId,
  type,
  entry,
  onSave,
  defaultWatchedAtForNew = null,
}: WatchEntryDialogProps) {
  const router = useRouter();
  const isEditing = !!entry;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [tagFriends, setTagFriends] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [taggedIds, setTaggedIds] = useState<Set<string>>(() => new Set());
  const [dateValue, setDateValue] = useState(() => {
    if (!entry && defaultWatchedAtForNew)
      return dateOnlyToDatetimeLocal(defaultWatchedAtForNew);
    return toDatetimeLocal(entry?.watchedAt) || toDatetimeLocal(new Date());
  });
  const [reviewValue, setReviewValue] = useState(entry?.review ?? "");

  const handleOpen = (val: boolean) => {
    if (val) {
      if (!entry && defaultWatchedAtForNew) {
        setDateValue(dateOnlyToDatetimeLocal(defaultWatchedAtForNew));
      } else {
        setDateValue(
          toDatetimeLocal(entry?.watchedAt) || toDatetimeLocal(new Date()),
        );
      }
      setReviewValue(entry?.review ?? "");
      if (!entry) setTaggedIds(new Set());
    }
    setOpen(val);
  };

  useEffect(() => {
    if (!open || isEditing) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/friends");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        friends: { id: string; name: string }[];
      };
      if (!cancelled) setTagFriends(data.friends);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isEditing]);

  const handleSave = () => {
    startTransition(async () => {
      const watchedAt = dateValue
        ? new Date(dateValue).toISOString()
        : new Date().toISOString();
      const review = reviewValue.trim() || null;

      if (isEditing) {
        const res = await fetch(`/api/media/entries/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedAt, review }),
        });
        if (res.ok) {
          const updated = (await res.json()) as WatchEntry;
          onSave(updated);
          setOpen(false);
        }
      } else {
        const withUserIds = Array.from(taggedIds);
        const res = await fetch(`/api/media/${tmdbId}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            watchedAt,
            review,
            ...(withUserIds.length > 0 ? { withUserIds } : {}),
          }),
        });
        if (res.ok) {
          const created = (await res.json()) as WatchEntry & {
            taggedCreatedCount?: number;
          };
          onSave(created);
          if (withUserIds.length > 0) router.refresh();
          setOpen(false);
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit viewing</span>
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Log a viewing
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit viewing" : "Log a viewing"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="watched-at">Date &amp; time watched</Label>
            <Input
              id="watched-at"
              type="datetime-local"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-fit"
            />
          </div>

          {!isEditing && tagFriends.length > 0 && (
            <div className="space-y-2">
              <Label>Also log for</Label>
              <p className="text-xs text-muted-foreground">
                Creates a watch entry for each friend (same time and review).
                Skips a friend if they already have a log for that title the
                same day.
              </p>
              <ul className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                {tagFriends.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`tag-friend-${f.id}`}
                      checked={taggedIds.has(f.id)}
                      onCheckedChange={() => {
                        setTaggedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(f.id)) next.delete(f.id);
                          else next.add(f.id);
                          return next;
                        });
                      }}
                    />
                    <label
                      htmlFor={`tag-friend-${f.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {f.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Review{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <div
              data-color-mode="dark"
              className="rounded-md overflow-hidden border border-border"
            >
              <MDEditor
                value={reviewValue}
                onChange={(val) => setReviewValue(val ?? "")}
                height={280}
                preview="live"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supports **bold**, *italic*, lists, links, and more.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
