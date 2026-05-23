"use client";

import { useEffect, useState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownContent } from "@/components/markdown-content";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: { id: string; name: string | null; avatarUrl: string | null };
};

interface ListItemCommentsProps {
  listSlug: string;
  itemId: string;
  currentUserId: string | undefined;
  isListOwner: boolean;
  canComment: boolean;
}

function formatCommentDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function ListItemComments({
  listSlug,
  itemId,
  currentUserId,
  isListOwner,
  canComment,
}: ListItemCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const markedRead = useRef(false);

  useEffect(() => {
    markedRead.current = false;
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch(
          `/api/lists/${listSlug}/items/${itemId}/comments`,
        );
        const data = (await r.json()) as { comments: Comment[] };
        if (cancelled) return;
        setComments(data.comments);
        setLoading(false);
        if (currentUserId && !markedRead.current) {
          markedRead.current = true;
          fetch(`/api/lists/${listSlug}/items/${itemId}/comments/read`, {
            method: "POST",
          }).catch(() => {});
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [listSlug, itemId, currentUserId]);

  async function handleSubmit() {
    const content = draft.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/lists/${listSlug}/items/${itemId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to post comment");
        return;
      }
      const data = (await res.json()) as { comment: Comment };
      setComments((prev) => [...prev, data.comment]);
      setDraft("");
      // mark as read after posting
      fetch(`/api/lists/${listSlug}/items/${itemId}/comments/read`, {
        method: "POST",
      }).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(
      `/api/lists/${listSlug}/items/${itemId}/comments/${commentId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const canDelete = currentUserId === comment.userId || isListOwner;
            return (
              <li key={comment.id} className="flex gap-2.5 group">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarImage src={comment.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[9px]">
                    {comment.user.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-medium truncate">
                      {comment.user.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatCommentDate(comment.createdAt)}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5">
                    <MarkdownContent
                      content={comment.content}
                      className="text-xs text-foreground"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canComment && (
        <div className="space-y-2">
          <MarkdownEditor
            value={draft}
            onChange={setDraft}
            placeholder="Add a comment…"
            height={120}
            maxLength={1000}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!draft.trim() || submitting}
              className="text-xs h-7"
            >
              {submitting ? "Posting…" : "Post"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
