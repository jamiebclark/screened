"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  activeTagFragment,
  completedTagFragments,
  splitTagInput,
  suggestTags,
} from "@/lib/list-item-tags";
import type { TagVocabularyEntry } from "@/lib/list-item-tags";

export type ItemTag = { id: string; label: string; normalized: string };

interface ListItemTagEditorProps {
  listSlug: string;
  itemId: string;
  tags: ItemTag[];
  vocabulary: TagVocabularyEntry[];
  canCurate: boolean;
  onChange: (tags: ItemTag[]) => void;
}

export function ListItemTagEditor({
  listSlug,
  itemId,
  tags,
  vocabulary,
  canCurate,
  onChange,
}: ListItemTagEditorProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Match on the fragment being typed, not the whole field, so suggestions
  // still work for a second tag after a comma.
  const fragment = activeTagFragment(input);
  const suggestions = useMemo(
    () =>
      suggestTags(vocabulary, fragment, {
        exclude: tags.map((t) => t.normalized),
      }),
    [vocabulary, fragment, tags],
  );

  async function submitLabels(labels: string[]) {
    if (labels.length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listSlug}/items/${itemId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        tags?: ItemTag[];
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      onChange(body.tags ?? tags);
      setInput("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function removeTag(tagId: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/lists/${listSlug}/items/${itemId}/tags/${tagId}`,
        { method: "DELETE" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        tags?: ItemTag[];
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      onChange(body.tags ?? tags);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Comma commits as well as Enter: it is the convention most tag inputs use,
    // and splitTagInput already treats it as the separator for pasted lists.
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      void submitLabels(splitTagInput(input));
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="rounded-full text-xs gap-1 pr-1"
          >
            {tag.label}
            {canCurate && (
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                disabled={pending}
                aria-label={`Remove tag ${tag.label}`}
                className="ml-0.5 rounded-full hover:text-destructive disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {canCurate && (
        <Popover open={suggestions.length > 0 && fragment.length > 0}>
          <PopoverAnchor asChild>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={pending}
              placeholder="Add a tag…"
              aria-describedby={`tag-hint-${itemId}`}
              className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </PopoverAnchor>
          <PopoverContent
            className="w-64 p-1"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {suggestions.map((entry) => (
              <button
                key={entry.normalized}
                type="button"
                onClick={() =>
                  void submitLabels([
                    // Keep anything already comma-terminated in the field, so
                    // picking a suggestion for the second tag does not discard
                    // the first.
                    ...completedTagFragments(input),
                    entry.label,
                  ])
                }
                className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <span>{entry.label}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.count}
                </span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}

      {canCurate && !error && (
        <p id={`tag-hint-${itemId}`} className="text-xs text-muted-foreground">
          Press Enter or comma to add. Separate several with commas.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
