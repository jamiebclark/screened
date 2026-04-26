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
import { BookOpen, Loader2 } from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface WatchLogDialogProps {
  tmdbId: number;
  type: "movie" | "tv";
  initialWatchedAt?: Date | string | null;
  initialReview?: string | null;
}

function toDatetimeLocal(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WatchLogDialog({
  tmdbId,
  type,
  initialWatchedAt,
  initialReview,
}: WatchLogDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [dateValue, setDateValue] = useState(() => toDatetimeLocal(initialWatchedAt));
  const [reviewValue, setReviewValue] = useState(initialReview ?? "");

  const handleSave = () => {
    startTransition(async () => {
      await fetch("/api/media/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          type,
          watchedAt: dateValue ? new Date(dateValue).toISOString() : null,
          review: reviewValue.trim() || null,
        }),
      });
      setOpen(false);
    });
  };

  const hasContent = !!initialReview || !!initialWatchedAt;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookOpen className="h-4 w-4 mr-1.5" />
          {hasContent ? "Edit log" : "Add log"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Watch log</DialogTitle>
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
            <Label>Review</Label>
            <div data-color-mode="dark" className="rounded-md overflow-hidden border border-border">
              <MDEditor
                value={reviewValue}
                onChange={(val) => setReviewValue(val ?? "")}
                height={280}
                preview="live"
                className="!bg-background"
              />
            </div>
            <p className="text-xs text-muted-foreground">Supports Markdown — **bold**, *italic*, lists, links, and more.</p>
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
