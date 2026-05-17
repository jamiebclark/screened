"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ListItemVotePill({
  listSlug,
  itemId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
  canVote,
}: {
  listSlug: string;
  itemId: string;
  upvotes: number;
  downvotes: number;
  userVote: number | null;
  canVote: boolean;
}) {
  const router = useRouter();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);

  async function vote(value: 1 | -1, e: React.MouseEvent) {
    e.stopPropagation();
    if (!canVote || loading) return;
    setLoading(true);

    const prevUp = upvotes,
      prevDown = downvotes,
      prevVote = userVote;

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
    <div
      className={cn(
        "flex items-center h-5 rounded-full bg-black/70 overflow-hidden text-[10px] font-medium",
        !canVote && "pointer-events-none",
      )}
    >
      <button
        onClick={(e) => vote(1, e)}
        disabled={loading}
        className={cn(
          "flex items-center gap-0.5 px-1.5 h-full transition-colors",
          canVote && "hover:bg-white/10",
          userVote === 1 ? "text-green-400" : "text-white/70",
        )}
      >
        <ThumbsUp className="h-2.5 w-2.5" />
        {upvotes > 0 && <span>{upvotes}</span>}
      </button>

      <div className="w-px h-3 bg-white/20 shrink-0" />

      <button
        onClick={(e) => vote(-1, e)}
        disabled={loading}
        className={cn(
          "flex items-center gap-0.5 px-1.5 h-full transition-colors",
          canVote && "hover:bg-white/10",
          userVote === -1 ? "text-red-400" : "text-white/70",
        )}
      >
        <ThumbsDown className="h-2.5 w-2.5" />
        {downvotes > 0 && <span>{downvotes}</span>}
      </button>
    </div>
  );
}
