"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListItemHideToggleProps {
  listSlug: string;
  itemId: string;
  isHidden: boolean;
  onChange: (isHidden: boolean) => void;
  className?: string;
}

export function ListItemHideToggle({
  listSlug,
  itemId,
  isHidden,
  onChange,
  className,
}: ListItemHideToggleProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (pending) return;
    const next = !isHidden;
    onChange(next);
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listSlug}/items/${itemId}/hidden`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        onChange(isHidden);
        setError(body.error ?? "Couldn't update that item");
        return;
      }
      router.refresh();
    } catch {
      onChange(isHidden);
      setError("Couldn't update that item");
    } finally {
      setPending(false);
    }
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={isHidden}
        aria-label={isHidden ? "Unhide item" : "Hide item"}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-50",
          className,
        )}
      >
        {isHidden ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
