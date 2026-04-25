"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
        await fetch(`/api/lists/${slug}/items?itemId=${itemId}`, { method: "DELETE" });
        router.refresh();
      } catch {
        // ignore
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="h-3 w-3 mr-1" />
      Remove
    </Button>
  );
}
