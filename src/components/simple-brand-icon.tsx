import type { SimpleIcon } from "simple-icons";
import { cn } from "@/lib/utils";

type SimpleBrandIconProps = {
  icon: SimpleIcon;
  className?: string;
};

/**
 * Single-color glyph from [Simple Icons](https://simpleicons.org) (CC0).
 * Default size is 16px (`h-4 w-4`); pass `className` to override.
 * Use with visible text or an {@link aria-label} on the parent.
 */
export function SimpleBrandIcon({ icon, className }: SimpleBrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden
    >
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}
