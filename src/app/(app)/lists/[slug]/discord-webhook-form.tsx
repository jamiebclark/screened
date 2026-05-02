"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DiscordWebhookFormProps {
  slug: string;
  currentWebhookUrl: string | null;
}

export function DiscordWebhookForm({ slug, currentWebhookUrl }: DiscordWebhookFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState(currentWebhookUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fetch(`/api/lists/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordWebhookUrl: url.trim() || null }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to save");
      }
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-8">
      <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4 text-primary" />
        Discord notifications
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Post to a Discord channel when items are added or a member marks something watched. Paste a
        channel webhook URL from Discord server settings.
      </p>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="text-xs font-mono"
        />
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            "Save"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
