"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const positionClass = {
  "top-left": "top-1.5 left-1.5",
  "top-right": "top-1.5 right-1.5",
} as const;

export type MediaCornerPosition = keyof typeof positionClass;

interface MediaCornerRemoveButtonProps {
  position: MediaCornerPosition;
  title: string;
  "aria-label": string;
  disabled?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/** Round X control for removing an item without blocking the poster link (matches watchlist / list grid). */
export function MediaCornerRemoveButton({
  position,
  title,
  "aria-label": ariaLabel,
  disabled,
  onClick,
}: MediaCornerRemoveButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      title={title}
      className={cn(
        "absolute z-10 h-7 w-7 rounded-full border border-border bg-background/90 shadow-sm text-muted-foreground hover:text-destructive hover:bg-background",
        positionClass[position]
      )}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
