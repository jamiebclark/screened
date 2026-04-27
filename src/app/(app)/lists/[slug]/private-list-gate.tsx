"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ListAccessRequestStatus,
  type ListAccessRequestStatus as AccessStatus,
} from "@/lib/notification-types";

type PrivateListGateProps = {
  slug: string;
  listName: string;
  initialRequestStatus: AccessStatus | null;
};

export function PrivateListGate({
  slug,
  listName,
  initialRequestStatus,
}: PrivateListGateProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AccessStatus | null>(
    initialRequestStatus,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/lists/${encodeURIComponent(slug)}/access-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message.trim() || undefined }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not send request",
        );
        return;
      }
      setStatus(ListAccessRequestStatus.PENDING);
      setMessage("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-muted p-3">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-xl font-semibold mb-1">Private list</h1>
        <p className="text-muted-foreground text-sm mb-6">
          <span className="font-medium text-foreground">{listName}</span> is
          private. Ask the owner for access.
        </p>

        {status === ListAccessRequestStatus.PENDING && (
          <p className="text-sm text-muted-foreground mb-4">
            Your request is pending. The list owner will be notified.
          </p>
        )}

        {status !== ListAccessRequestStatus.PENDING && (
          <div className="text-left space-y-3">
            {status === ListAccessRequestStatus.DENIED && (
              <p className="text-xs text-muted-foreground">
                Your previous request was declined. You can send another one.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="access-note">Message (optional)</Label>
              <Textarea
                id="access-note"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself or say why you’d like to join"
                rows={3}
                className="resize-none"
                maxLength={500}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Request access
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
