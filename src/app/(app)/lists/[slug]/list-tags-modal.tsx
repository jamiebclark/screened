"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TagVocabularyEntry } from "@/lib/list-item-tags";

interface ListTagsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listSlug: string;
  tags: TagVocabularyEntry[];
  canCurate: boolean;
}

export function ListTagsModal({
  open,
  onOpenChange,
  listSlug,
  tags,
  canCurate,
}: ListTagsModalProps) {
  const router = useRouter();
  const [newLabel, setNewLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameLabel, setRenameLabel] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );

  async function createTag() {
    if (!newLabel.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listSlug}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      setNewLabel("");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function renameTag(tagId: string) {
    if (!renameLabel.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listSlug}/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: renameLabel }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      setRenamingId(null);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function deleteTag(tagId: string) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listSlug}/tags/${tagId}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      setConfirmingDeleteId(null);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List tags</DialogTitle>
        </DialogHeader>

        {canCurate && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void createTag();
                }
              }}
              disabled={pending}
              placeholder="Declare a new tag…"
              className="flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button
              type="button"
              size="icon"
              className="h-8 w-8"
              onClick={() => void createTag()}
              disabled={pending || !newLabel.trim()}
              aria-label="Declare tag"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="divide-y rounded-lg border max-h-80 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No tags declared yet.
            </p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="relative flex items-center justify-between gap-2 px-3 py-2"
              >
                {renamingId === tag.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={renameLabel}
                      onChange={(e) => setRenameLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void renameTag(tag.id);
                        }
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      autoFocus
                      disabled={pending}
                      className="flex-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setRenamingId(null)}
                      aria-label="Cancel rename"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm">{tag.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {tag.count}
                      </span>
                      {canCurate && (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setRenamingId(tag.id);
                              setRenameLabel(tag.label);
                            }}
                            aria-label={`Rename tag ${tag.label}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setConfirmingDeleteId(tag.id)}
                            aria-label={`Delete tag ${tag.label}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {confirmingDeleteId === tag.id && (
                  <div className="absolute inset-x-0 -mt-2 flex items-center justify-between gap-2 rounded-md border bg-background p-2 shadow-sm">
                    <span className="text-xs text-muted-foreground">
                      Remove &ldquo;{tag.label}&rdquo; from {tag.count} item
                      {tag.count !== 1 ? "s" : ""}?
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void deleteTag(tag.id)}
                        disabled={pending}
                      >
                        Delete
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
