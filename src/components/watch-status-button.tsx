"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Clock,
  Bookmark,
  X,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type WatchStatus = "WATCHLIST" | "WATCHING" | "WATCHED" | "DROPPED";

interface WatchStatusButtonProps {
  tmdbId: number;
  type: "movie" | "tv";
  currentStatus: WatchStatus | null;
  onStatusChange?: (status: WatchStatus | null) => void;
}

const statusConfig: Record<
  WatchStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  WATCHED: { label: "Watched", icon: Eye, color: "text-status-watched" },
  WATCHING: { label: "Watching", icon: Clock, color: "text-status-watching" },
  WATCHLIST: {
    label: "Watchlist",
    icon: Bookmark,
    color: "text-status-watchlist",
  },
  DROPPED: { label: "Dropped", icon: X, color: "text-status-dropped" },
};

/** Remount when server-sourced status changes so local state stays aligned without a prop-sync effect. */
export function WatchStatusButton(props: WatchStatusButtonProps) {
  return (
    <WatchStatusButtonInner key={props.currentStatus ?? "none"} {...props} />
  );
}

function WatchStatusButtonInner({
  tmdbId,
  type,
  currentStatus,
  onStatusChange,
}: WatchStatusButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<WatchStatus | null>(currentStatus);
  const [isPending, startTransition] = useTransition();

  const updateStatus = async (newStatus: WatchStatus | null) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/media/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId, type, status: newStatus }),
        });
        if (res.ok) {
          setStatus(newStatus);
          onStatusChange?.(newStatus);
          router.refresh();
        }
      } catch {
        // ignore
      }
    });
  };

  const current = status ? statusConfig[status] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={status ? "secondary" : "outline"}
          size="sm"
          className={cn("gap-1.5", current?.color)}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : current ? (
            <>
              <current.icon className="h-4 w-4" />
              {current.label}
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              Track
            </>
          )}
          {!isPending && <ChevronDown className="h-3 w-3 opacity-60" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(
          Object.entries(statusConfig) as [
            WatchStatus,
            (typeof statusConfig)[WatchStatus],
          ][]
        ).map(([value, { label, icon: Icon, color }]) => (
          <DropdownMenuItem
            key={value}
            onClick={() => updateStatus(value)}
            className={cn("cursor-pointer", status === value && "bg-accent")}
          >
            <Icon className={cn("mr-2 h-4 w-4", color)} />
            {label}
            {status === value && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        {status && (
          <DropdownMenuItem
            onClick={() => updateStatus(null)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Remove
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
