"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface ListItemDeleteButtonProps {
  itemId: string;
  listSlug: string;
  onDeleted?: () => void;
}

export function ListItemDeleteButton({
  itemId,
  listSlug,
  onDeleted,
}: ListItemDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/lists/${listSlug}/items?itemId=${itemId}`,
          { method: "DELETE" },
        );
        if (res.ok) {
          onDeleted?.();
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Remove from list
    </button>
  );
}
