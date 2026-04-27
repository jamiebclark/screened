"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserPlus, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProfileFriendStateJson =
  | { kind: "self" }
  | { kind: "friends" }
  | { kind: "outgoing"; requestId: string }
  | { kind: "incoming"; requestId: string }
  | { kind: "none" };

export function ProfileFriendActions({
  profileUserId,
  className,
  initial,
}: {
  profileUserId: string;
  className?: string;
  initial: ProfileFriendStateJson;
}) {
  const router = useRouter();
  const [state, setState] = useState<ProfileFriendStateJson>(initial);
  const [busy, setBusy] = useState(false);

  if (state.kind === "self") return null;

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {state.kind === "none" && (
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            void withBusy(async () => {
              const res = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toUserId: profileUserId }),
              });
              if (!res.ok) return;
              const body = (await res.json()) as {
                status?: string;
                requestId?: string;
                friendState?: ProfileFriendStateJson;
              };
              if (body.friendState) {
                setState(body.friendState);
                return;
              }
              if (body.status === "friends") {
                setState({ kind: "friends" });
                return;
              }
              if (body.status === "pending" && body.requestId) {
                setState({ kind: "outgoing", requestId: body.requestId });
              }
            })
          }
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          <span className="ml-1.5">Add friend</span>
        </Button>
      )}

      {state.kind === "outgoing" && (
        <>
          <span className="text-sm text-muted-foreground">Request sent</span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void withBusy(async () => {
                const res = await fetch(
                  `/api/friends/requests/${encodeURIComponent(state.requestId)}`,
                  { method: "DELETE" },
                );
                const j = (await res.json().catch(() => ({}))) as {
                  friendState?: ProfileFriendStateJson;
                };
                if (res.ok && j.friendState) setState(j.friendState);
                else if (res.ok) setState({ kind: "none" });
              })
            }
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cancel request"
            )}
          </Button>
        </>
      )}

      {state.kind === "incoming" && (
        <>
          <span className="text-sm text-amber-600 dark:text-amber-400">
            Friend request
          </span>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              void withBusy(async () => {
                const res = await fetch(
                  `/api/friends/requests/${encodeURIComponent(state.requestId)}/accept`,
                  { method: "POST" },
                );
                const j = (await res.json().catch(() => ({}))) as {
                  friendState?: ProfileFriendStateJson;
                };
                if (res.ok) {
                  setState(j.friendState ?? { kind: "friends" });
                }
              })
            }
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span className="ml-1">Accept</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void withBusy(async () => {
                const res = await fetch(
                  `/api/friends/requests/${encodeURIComponent(state.requestId)}`,
                  { method: "DELETE" },
                );
                const j = (await res.json().catch(() => ({}))) as {
                  friendState?: ProfileFriendStateJson;
                };
                if (res.ok) setState(j.friendState ?? { kind: "none" });
              })
            }
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span className="ml-1">Decline</span>
          </Button>
        </>
      )}

      {state.kind === "friends" && (
        <>
          <span className="text-sm font-medium text-muted-foreground">
            Friends
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void withBusy(async () => {
                const res = await fetch(
                  `/api/friends/${encodeURIComponent(profileUserId)}`,
                  { method: "DELETE" },
                );
                const j = (await res.json().catch(() => ({}))) as {
                  friendState?: ProfileFriendStateJson;
                };
                if (res.ok) setState(j.friendState ?? { kind: "none" });
              })
            }
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            <span className="ml-1">Unfriend</span>
          </Button>
        </>
      )}
    </div>
  );
}
