"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserBrief = { id: string; name: string; avatarUrl: string | null };

type IncomingRequest = { id: string; fromUser: UserBrief; createdAt: Date };
type OutgoingRequest = { id: string; toUser: UserBrief; createdAt: Date };

interface FriendRequestsPanelProps {
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function FriendRequestsPanel({
  incoming,
  outgoing,
}: FriendRequestsPanelProps) {
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (incoming.length === 0 && outgoing.length === 0) return null;

  const onAccept = async (requestId: string) => {
    setActing(`acc-${requestId}`);
    try {
      const res = await fetch(
        `/api/friends/requests/${encodeURIComponent(requestId)}/accept`,
        { method: "POST" },
      );
      if (!res.ok) return;
      startTransition(() => router.refresh());
    } finally {
      setActing(null);
    }
  };

  const onDeleteRequest = async (requestId: string) => {
    setActing(`del-${requestId}`);
    try {
      const res = await fetch(
        `/api/friends/requests/${encodeURIComponent(requestId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) return;
      startTransition(() => router.refresh());
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <section aria-labelledby="incoming-heading">
          <h3 className="mb-3 text-base font-semibold" id="incoming-heading">
            Requests for you{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {incoming.length}
            </span>
          </h3>
          <ul className="space-y-2">
            {incoming.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <Link
                  href={`/profile/${r.fromUser.id}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={r.fromUser.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials(r.fromUser.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium hover:underline">
                    {r.fromUser.name}
                  </span>
                </Link>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onDeleteRequest(r.id)}
                    disabled={acting != null}
                    aria-label="Decline"
                  >
                    {acting === `del-${r.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void onAccept(r.id)}
                    disabled={acting != null}
                  >
                    {acting === `acc-${r.id}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="ml-1">Accept</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section aria-labelledby="outgoing-heading">
          <h3 className="mb-3 text-base font-semibold" id="outgoing-heading">
            Pending{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {outgoing.length}
            </span>
          </h3>
          <ul className="space-y-2">
            {outgoing.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <Link
                  href={`/profile/${r.toUser.id}`}
                  className="flex min-w-0 items-center gap-2"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={r.toUser.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials(r.toUser.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium hover:underline">
                    {r.toUser.name}
                  </span>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onDeleteRequest(r.id)}
                  disabled={acting != null}
                >
                  {acting === `del-${r.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cancel"
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
