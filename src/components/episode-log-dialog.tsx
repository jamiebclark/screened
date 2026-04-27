"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
import { Pencil, Plus, Loader2 } from "lucide-react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

function toDatetimeLocal(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface EpisodeLogDialogProps {
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  /** Existing log from server (optional). */
  initialWatchedAt?: string | null;
  initialReview?: string | null;
  triggerVariant?: "row" | "icon";
  onSaved?: () => void;
}

export function EpisodeLogDialog({
  tmdbId,
  seasonNumber,
  episodeNumber,
  episodeTitle,
  initialWatchedAt = null,
  initialReview = null,
  triggerVariant = "row",
  onSaved,
}: EpisodeLogDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasExisting =
    initialWatchedAt != null ||
    (initialReview != null && initialReview.trim().length > 0);
  const [dateValue, setDateValue] = useState(
    () => toDatetimeLocal(initialWatchedAt) || toDatetimeLocal(new Date()),
  );
  const [reviewValue, setReviewValue] = useState(initialReview ?? "");

  const handleOpen = (val: boolean) => {
    if (val) {
      setDateValue(
        toDatetimeLocal(initialWatchedAt) || toDatetimeLocal(new Date()),
      );
      setReviewValue(initialReview ?? "");
    }
    setOpen(val);
  };

  const handleSave = () => {
    startTransition(async () => {
      const watchedAt = dateValue
        ? new Date(dateValue).toISOString()
        : new Date().toISOString();
      const review = reviewValue.trim() || null;
      const res = await fetch(`/api/media/${tmdbId}/episodes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonNumber,
          episodeNumber,
          watchedAt,
          review,
        }),
      });
      if (res.ok) {
        setOpen(false);
        onSaved?.();
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {triggerVariant === "icon" ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Edit episode log</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {hasExisting ? (
              <>
                <Pencil className="h-3 w-3 mr-1" />
                Edit log
              </>
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                Log
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {hasExisting ? "Edit viewing" : "Log a viewing"} · S{seasonNumber}E
            {episodeNumber}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-normal">
            {episodeTitle}
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor={`ep-watched-at-${seasonNumber}-${episodeNumber}`}>
              Date &amp; time watched
            </Label>
            <Input
              id={`ep-watched-at-${seasonNumber}-${episodeNumber}`}
              type="datetime-local"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-fit"
            />
          </div>

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
                height={240}
                preview="live"
              />
            </div>
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
