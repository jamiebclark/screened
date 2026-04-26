"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
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
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
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
  const isEditing = !!entry;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [dateValue, setDateValue] = useState(() => {
    if (!entry && defaultWatchedAtForNew) return dateOnlyToDatetimeLocal(defaultWatchedAtForNew);
    return toDatetimeLocal(entry?.watchedAt) || toDatetimeLocal(new Date());
  });
  const [reviewValue, setReviewValue] = useState(entry?.review ?? "");

  const handleOpen = (val: boolean) => {
    if (val) {
      if (!entry && defaultWatchedAtForNew) {
        setDateValue(dateOnlyToDatetimeLocal(defaultWatchedAtForNew));
      } else {
        setDateValue(toDatetimeLocal(entry?.watchedAt) || toDatetimeLocal(new Date()));
      }
      setReviewValue(entry?.review ?? "");
    }
    setOpen(val);
  };

  const handleSave = () => {
    startTransition(async () => {
      const watchedAt = dateValue ? new Date(dateValue).toISOString() : new Date().toISOString();
      const review = reviewValue.trim() || null;

      if (isEditing) {
        const res = await fetch(`/api/media/entries/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ watchedAt, review }),
        });
        if (res.ok) {
          const updated = await res.json() as WatchEntry;
          onSave(updated);
          setOpen(false);
        }
      } else {
        const res = await fetch(`/api/media/${tmdbId}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, watchedAt, review }),
        });
        if (res.ok) {
          const created = await res.json() as WatchEntry;
          onSave(created);
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
          <DialogTitle>{isEditing ? "Edit viewing" : "Log a viewing"}</DialogTitle>
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

          <div className="space-y-1.5">
            <Label>Review <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div data-color-mode="dark" className="rounded-md overflow-hidden border border-border">
              <MDEditor
                value={reviewValue}
                onChange={(val) => setReviewValue(val ?? "")}
                height={280}
                preview="live"
              />
            </div>
            <p className="text-xs text-muted-foreground">Supports **bold**, *italic*, lists, links, and more.</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
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
