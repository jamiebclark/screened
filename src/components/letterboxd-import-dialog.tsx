"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ImportResponse } from "@/app/api/lists/[slug]/import/route";

interface LetterboxdImportDialogProps {
  slug: string;
}

type Phase = "input" | "importing" | "done";

export function LetterboxdImportDialog({ slug }: LetterboxdImportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setPhase("input");
    setError(null);
    setResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const letterboxdUrl = (form.get("letterboxdUrl") as string).trim();

    setError(null);
    setPhase("importing");

    startTransition(async () => {
      try {
        const res = await fetch(`/api/lists/${slug}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ letterboxdUrl }),
        });

        const data = (await res.json()) as ImportResponse & { error?: string };

        if (!res.ok) {
          setError(data.error ?? "Import failed");
          setPhase("input");
          return;
        }

        setResult(data);
        setPhase("done");
        router.refresh();
      } catch {
        setError("Something went wrong. Please try again.");
        setPhase("input");
      }
    });
  };

  const failedItems = result?.results.filter((r) => r.status === "failed") ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1.5" />
          Import from Letterboxd
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from Letterboxd</DialogTitle>
        </DialogHeader>

        {phase === "input" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste a public Letterboxd list, watchlist, or films page URL. Films will be
              looked up on TMDB and added to this list.
            </p>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="letterboxd-url">Letterboxd URL</Label>
              <Input
                id="letterboxd-url"
                name="letterboxdUrl"
                type="url"
                required
                placeholder="https://letterboxd.com/username/list/my-list/"
                autoComplete="off"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Examples:
              <br />
              <code className="text-xs">letterboxd.com/username/list/list-name/</code>
              <br />
              <code className="text-xs">letterboxd.com/username/watchlist/</code>
            </p>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Import films
            </Button>
          </form>
        )}

        {phase === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Importing films…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fetching each film from Letterboxd and matching to TMDB. This may take a
                moment for longer lists.
              </p>
            </div>
          </div>
        )}

        {phase === "done" && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-xl font-bold text-green-400">{result.added}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Added</p>
              </div>
              <div className="rounded-md bg-muted/50 border border-border p-3">
                <p className="text-xl font-bold">{result.alreadyExisted}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Already in list</p>
              </div>
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-xl font-bold text-destructive">{result.failed}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Failed</p>
              </div>
            </div>

            {result.added > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Successfully imported {result.added} film{result.added !== 1 ? "s" : ""} into
                the list.
              </div>
            )}

            {failedItems.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  Could not import ({failedItems.length}):
                </p>
                <ul className="space-y-1 max-h-36 overflow-y-auto">
                  {failedItems.map((item) => (
                    <li
                      key={item.slug}
                      className="text-xs text-muted-foreground flex items-baseline gap-1.5"
                    >
                      <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">
                        {item.slug}
                      </span>
                      {item.error && (
                        <span className="text-destructive/70">— {item.error}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={reset} className="flex-1">
                Import another
              </Button>
              <Button size="sm" onClick={() => setOpen(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
