"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ListItemVoteControls({
  listSlug,
  itemId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
}: {
  listSlug: string;
  itemId: string;
  upvotes: number;
  downvotes: number;
  userVote: number | null;
}) {
  const router = useRouter();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);

  async function vote(value: 1 | -1) {
    if (loading) return;
    setLoading(true);

    const prevUp = upvotes;
    const prevDown = downvotes;
    const prevVote = userVote;

    if (userVote === value) {
      setUserVote(null);
      if (value === 1) setUpvotes((u) => u - 1);
      else setDownvotes((d) => d - 1);
    } else {
      if (userVote === 1) setUpvotes((u) => u - 1);
      if (userVote === -1) setDownvotes((d) => d - 1);
      setUserVote(value);
      if (value === 1) setUpvotes((u) => u + 1);
      else setDownvotes((d) => d + 1);
    }

    try {
      const res = await fetch(`/api/lists/${listSlug}/items/${itemId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as {
        upvotes: number;
        downvotes: number;
        userVote: number | null;
      };
      setUpvotes(data.upvotes);
      setDownvotes(data.downvotes);
      setUserVote(data.userVote);
      router.refresh();
    } catch {
      setUpvotes(prevUp);
      setDownvotes(prevDown);
      setUserVote(prevVote);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => vote(1)}
        disabled={loading}
        className={cn(
          "flex items-center gap-1 text-xs px-1 py-0.5 rounded transition-colors disabled:opacity-50",
          userVote === 1
            ? "text-green-500"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ThumbsUp className="h-3 w-3" />
        {upvotes > 0 && <span>{upvotes}</span>}
      </button>
      <button
        onClick={() => vote(-1)}
        disabled={loading}
        className={cn(
          "flex items-center gap-1 text-xs px-1 py-0.5 rounded transition-colors disabled:opacity-50",
          userVote === -1
            ? "text-red-400"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ThumbsDown className="h-3 w-3" />
        {downvotes > 0 && <span>{downvotes}</span>}
      </button>
    </div>
  );
}
