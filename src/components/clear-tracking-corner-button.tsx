"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MediaCornerRemoveButton, type MediaCornerPosition } from "@/components/media-corner-remove-button";

interface ClearTrackingCornerButtonProps {
  tmdbId: number;
  type: "movie" | "tv";
  position: MediaCornerPosition;
  title: string;
  ariaLabel: string;
}

/** Clears user media tracking (same as Watch status → Remove). */
export function ClearTrackingCornerButton({
  tmdbId,
  type,
  position,
  title,
  ariaLabel,
}: ClearTrackingCornerButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/media/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId, type, status: null }),
        });
        if (res.ok) {
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  return (
    <MediaCornerRemoveButton
      position={position}
      title={title}
      aria-label={ariaLabel}
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        remove();
      }}
    />
  );
}
