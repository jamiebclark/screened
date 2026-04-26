"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Check, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface List {
  id: string;
  name: string;
  slug: string;
  _count?: { items: number };
}

interface AddToListDialogProps {
  tmdbId: number;
  type: "movie" | "tv";
  title: string;
  /** Called after a title is successfully added to a list (in addition to router.refresh). */
  onAddedToList?: () => void;
}

export function AddToListDialog({ tmdbId, type, title, onAddedToList }: AddToListDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    void Promise.resolve().then(() => {
      setLoading(true);
      return fetch("/api/lists?mine=true", { signal: ac.signal });
    })
      .then((r) => r.json())
      .then((data: List[]) => {
        if (!ac.signal.aborted) setLists(data);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [open]);

  const addToList = (listSlug: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/lists/${listSlug}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId, type }),
        });
        if (res.ok) {
          setAddedTo((prev) => new Set([...prev, listSlug]));
          onAddedToList?.();
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add to list
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to list</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{title}</p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="py-8 text-center">
            <ListVideo className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No lists yet.</p>
            <Button variant="link" asChild className="text-sm mt-1">
              <Link href="/lists/new">Create a list</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lists.map((list) => {
              const isAdded = addedTo.has(list.slug);
              return (
                <button
                  key={list.id}
                  onClick={() => !isAdded && addToList(list.slug)}
                  disabled={isPending || isAdded}
                  className={cn(
                    "w-full flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm transition-colors",
                    isAdded
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "hover:bg-accent cursor-pointer"
                  )}
                >
                  <span className="font-medium">{list.name}</span>
                  {isAdded ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
