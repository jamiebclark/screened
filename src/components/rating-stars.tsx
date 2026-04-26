"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  tmdbId: number;
  type: "movie" | "tv";
  currentRating: number | null;
  onRatingChange?: (rating: number | null) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RatingStars({ tmdbId, type, currentRating, onRatingChange, readonly = false, size = "md" }: RatingStarsProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(currentRating);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    setRating(currentRating);
  }, [currentRating]);

  const sizes = {
    sm: "h-3.5 w-3.5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const handleClick = async (value: number) => {
    if (readonly) return;
    const newRating = rating === value ? null : value;

    try {
      const res = await fetch("/api/media/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type, rating: newRating }),
      });
      if (res.ok) {
        setRating(newRating);
        onRatingChange?.(newRating);
        router.refresh();
      }
    } catch {
      // ignore
    }
  };

  const displayValue = hover ?? rating ?? 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          disabled={readonly}
          onClick={() => handleClick(value)}
          onMouseEnter={() => !readonly && setHover(value)}
          onMouseLeave={() => !readonly && setHover(null)}
          className={cn("transition-colors", !readonly && "cursor-pointer hover:scale-110")}
          aria-label={`Rate ${value} star${value !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              sizes[size],
              displayValue >= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}
