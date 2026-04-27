"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type InviteRow = {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  maxUses: number;
  uses: number;
  note: string | null;
};

export function SignupInvitesManager() {
  const router = useRouter();
  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [note, setNote] = useState("");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/signup-invites")
      .then(async (res) => {
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(d.error ?? "Failed to load");
        }
        return res.json() as Promise<{ invites: InviteRow[] }>;
      })
      .then((data) => {
        setInvites(data.invites);
        setLoadError(null);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setLastInviteUrl(null);
    startTransition(async () => {
      const body: {
        expiresInDays?: number | null;
        maxUses?: number;
        note?: string | null;
      } = {};
      if (expiresInDays.trim() === "") {
        body.expiresInDays = null;
      } else {
        const d = parseInt(expiresInDays, 10);
        if (Number.isNaN(d) || d < 0) {
          setFormMessage({
            type: "err",
            text: "Enter a valid number of days, or leave empty for no expiry",
          });
          return;
        }
        body.expiresInDays = d;
      }
      const mu = parseInt(maxUses, 10);
      if (Number.isNaN(mu) || mu < 1) {
        setFormMessage({ type: "err", text: "Max uses must be at least 1" });
        return;
      }
      body.maxUses = mu;
      body.note = note.trim() || null;

      const res = await fetch("/api/admin/signup-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        inviteUrl?: string;
        error?: string;
      };
      if (!res.ok) {
        setFormMessage({
          type: "err",
          text: data.error ?? "Failed to create invite",
        });
        return;
      }
      setFormMessage(null);
      if (data.inviteUrl) {
        setLastInviteUrl(data.inviteUrl);
        try {
          await navigator.clipboard.writeText(data.inviteUrl);
        } catch {
          // ignore
        }
      }
      setNote("");
      load();
      router.refresh();
    });
  };

  const revoke = (id: string) => {
    startTransition(async () => {
      const res = await fetch(
        `/api/admin/signup-invites?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
      if (res.status === 204) {
        load();
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormMessage({ type: "err", text: data.error ?? "Failed to revoke" });
      }
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Create invite
          </CardTitle>
          <CardDescription>
            New users can register with a link containing this token when public
            signup is turned off. The full URL is only shown once—copy it
            immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createInvite} className="space-y-4 max-w-md">
            {formMessage && (
              <p
                className={`text-sm ${formMessage.type === "err" ? "text-destructive" : "text-muted-foreground"}`}
                role="alert"
              >
                {formMessage.text}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="maxUses">Max uses</Label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires">Expires in (days, optional)</Label>
              <Input
                id="expires"
                type="number"
                min={0}
                placeholder="No expiry if empty"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. for Jamie"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate link
            </Button>
            {lastInviteUrl && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm break-all">
                <p className="text-muted-foreground text-xs mb-1">
                  Last created (also copied):
                </p>
                <a
                  href={lastInviteUrl}
                  className="text-primary hover:underline"
                >
                  {lastInviteUrl}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7"
                  onClick={() => {
                    void navigator.clipboard.writeText(lastInviteUrl);
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy again
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Active invites</h2>
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {invites === null && !loadError && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        {invites && invites.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active invites. Create one above.
          </p>
        )}
        {invites && invites.length > 0 && (
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border p-3 text-sm"
              >
                <div>
                  <p className="text-muted-foreground text-xs">
                    Created {new Date(inv.createdAt).toLocaleString()}
                  </p>
                  {inv.note && <p className="font-medium">Note: {inv.note}</p>}
                  <p>
                    Uses {inv.uses} / {inv.maxUses}
                    {inv.expiresAt && (
                      <span className="text-muted-foreground">
                        {" "}
                        · Expires {new Date(inv.expiresAt).toLocaleString()}
                      </span>
                    )}
                    {!inv.expiresAt && (
                      <span className="text-muted-foreground">
                        {" "}
                        · No expiry
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => revoke(inv.id)}
                  disabled={isPending}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
