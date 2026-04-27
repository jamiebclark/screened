"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2, X } from "lucide-react";
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
          {
            method: "DELETE",
          },
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
        <div className="px-3 py-2 border-b border-border">
          <p className="text-sm font-medium">Notifications</p>
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
