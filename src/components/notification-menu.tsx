"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ListAccessRequestStatus,
  NotificationType,
  type ListAccessRequestStatus as AccessStatus,
  type NotificationType as NotifType,
} from "@/lib/notification-types";
import { cn } from "@/lib/utils";

function posterUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

type NotificationItem = {
  id: string;
  type: NotifType;
  readAt: string | null;
  createdAt: string;
  listAccessRequest: {
    id: string;
    status: AccessStatus;
    list: { id: string; name: string; slug: string };
    requester: { id: string; name: string; avatarUrl: string | null };
  } | null;
  friendRequest: {
    id: string;
    fromUser: { id: string; name: string; avatarUrl: string | null };
  } | null;
  watchEntry: {
    id: string;
    watcher: { id: string; name: string; avatarUrl: string | null };
    mediaItem: {
      tmdbId: number;
      type: "MOVIE" | "TV";
      title: string;
      poster: string | null;
    };
  } | null;
};

type NotificationsResponse = {
  unreadCount: number;
  items: NotificationItem[];
};

export function NotificationMenu({
  initialUnreadCount,
}: {
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = (await res.json()) as NotificationsResponse;
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [open, load]);

  const unread = data?.unreadCount ?? initialUnreadCount;

  const markAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (!res.ok) return;
      await load();
      router.refresh();
    } finally {
      setMarkingAllRead(false);
    }
  };

  const respond = async (requestId: string, action: "approve" | "deny") => {
    setActingId(requestId);
    try {
      const res = await fetch(
        `/api/access-requests/${encodeURIComponent(requestId)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) return;
      await load();
      router.refresh();
    } finally {
      setActingId(null);
    }
  };

  const respondFriend = async (
    requestId: string,
    action: "accept" | "decline",
  ) => {
    setActingId(requestId);
    try {
      if (action === "accept") {
        const res = await fetch(
          `/api/friends/requests/${encodeURIComponent(requestId)}/accept`,
          { method: "POST" },
        );
        if (!res.ok) return;
      } else {
        const res = await fetch(
          `/api/friends/requests/${encodeURIComponent(requestId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) return;
      }
      await load();
      router.refresh();
    } finally {
      setActingId(null);
    }
  };

  const items = data?.items ?? [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] p-0"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              disabled={markingAllRead}
              onClick={(e) => {
                e.preventDefault();
                void markAllRead();
              }}
            >
              {markingAllRead ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-3">
              No notifications yet
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-3 py-2.5 text-sm",
                    !n.readAt && "bg-muted/40",
                  )}
                >
                  {n.type === NotificationType.LIST_ACCESS_REQUEST &&
                  n.listAccessRequest ? (
                    <AccessRequestRow
                      n={n}
                      actingId={actingId}
                      onApprove={() =>
                        respond(n.listAccessRequest!.id, "approve")
                      }
                      onDeny={() => respond(n.listAccessRequest!.id, "deny")}
                    />
                  ) : n.type === NotificationType.FRIEND_REQUEST &&
                    n.friendRequest ? (
                    <FriendRequestRow
                      n={n}
                      actingId={actingId}
                      onAccept={() =>
                        respondFriend(n.friendRequest!.id, "accept")
                      }
                      onDecline={() =>
                        respondFriend(n.friendRequest!.id, "decline")
                      }
                    />
                  ) : n.type ===
                      NotificationType.FRIEND_WATCHED_YOUR_WATCHLIST &&
                    n.watchEntry ? (
                    <FriendWatchedRow n={n} />
                  ) : (
                    <span className="text-muted-foreground">Notification</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FriendWatchedRow({ n }: { n: NotificationItem }) {
  const we = n.watchEntry!;
  const href =
    we.mediaItem.type === "MOVIE"
      ? `/movies/${we.mediaItem.tmdbId}`
      : `/tv/${we.mediaItem.tmdbId}`;
  const poster = posterUrl(we.mediaItem.poster);
  const watcherInitials = we.watcher.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex gap-2 items-start">
      <Link href={`/profile/${we.watcher.id}`} className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={we.watcher.avatarUrl ?? undefined} />
          <AvatarFallback className="text-[10px]">{watcherInitials}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground leading-tight">
          <Link
            href={`/profile/${we.watcher.id}`}
            className="font-medium text-foreground hover:underline"
          >
            {we.watcher.name}
          </Link>{" "}
          watched{" "}
          <Link href={href} className="font-medium text-foreground hover:underline">
            {we.mediaItem.title}
          </Link>{" "}
          which is on your watchlist
        </p>
      </div>
      {poster && (
        <Link href={href} className="shrink-0">
          <Image
            src={poster}
            alt={we.mediaItem.title}
            width={28}
            height={42}
            className="rounded object-cover"
            unoptimized
          />
        </Link>
      )}
    </div>
  );
}

function FriendRequestRow({
  n,
  actingId,
  onAccept,
  onDecline,
}: {
  n: NotificationItem;
  actingId: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const fr = n.friendRequest!;
  const busy = actingId === fr.id;
  const initials =
    fr.fromUser.name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Link href={`/profile/${fr.fromUser.id}`}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={fr.fromUser.avatarUrl ?? undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-tight">
            <Link
              href={`/profile/${fr.fromUser.id}`}
              className="font-medium text-foreground hover:underline"
            >
              {fr.fromUser.name}
            </Link>{" "}
            sent you a friend request
          </p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            onDecline();
          }}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          <span className="ml-1">Decline</span>
        </Button>
        <Button
          size="sm"
          className="h-8"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            onAccept();
          }}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span className="ml-1">Accept</span>
        </Button>
      </div>
    </div>
  );
}

function AccessRequestRow({
  n,
  actingId,
  onApprove,
  onDeny,
}: {
  n: NotificationItem;
  actingId: string | null;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const req = n.listAccessRequest!;
  const pending = req.status === ListAccessRequestStatus.PENDING;
  const busy = actingId === req.id;
  const initials =
    req.requester.name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={req.requester.avatarUrl ?? undefined} />
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground leading-tight">
            <span className="font-medium text-foreground">
              {req.requester.name}
            </span>{" "}
            requested access to{" "}
            <Link
              href={`/lists/${req.list.slug}`}
              className="text-primary hover:underline font-medium"
            >
              {req.list.name}
            </Link>
          </p>
        </div>
      </div>
      {pending ? (
        <div className="flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              onDeny();
            }}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">Deny</span>
          </Button>
          <Button
            size="sm"
            className="h-8"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              onApprove();
            }}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span className="ml-1">Approve</span>
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {req.status === ListAccessRequestStatus.APPROVED
            ? "Approved"
            : "Declined"}
        </p>
      )}
    </div>
  );
}
