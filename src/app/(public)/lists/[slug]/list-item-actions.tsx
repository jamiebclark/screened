"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MediaCornerRemoveButton } from "@/components/media-corner-remove-button";

interface ListItemActionsProps {
  itemId: string;
  slug: string;
}

export function ListItemActions({ itemId, slug }: ListItemActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/lists/${slug}/items?itemId=${itemId}`, {
          method: "DELETE",
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
      position="top-right"
      title="Remove from list"
      aria-label="Remove from list"
      disabled={isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDelete();
      }}
    />
  );
}
