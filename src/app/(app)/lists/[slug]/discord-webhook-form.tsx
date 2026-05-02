"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Unlink, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

type Channel = { id: string; name: string };
type ChannelGroup = { guildId: string; guildName: string; channels: Channel[] };

interface DiscordWebhookFormProps {
  slug: string;
  connectedChannelName: string | null;
  connectedGuildName: string | null;
}

export function DiscordWebhookForm({
  slug,
  connectedChannelName,
  connectedGuildName,
}: DiscordWebhookFormProps) {
  const router = useRouter();
  const [groups, setGroups] = useState<ChannelGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState("");
  const [selectedChannelName, setSelectedChannelName] = useState("");
  const [selectedGuildName, setSelectedGuildName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConnected = !!(connectedChannelName && connectedGuildName);

  useEffect(() => {
    fetch("/api/discord/channels")
      .then((r) => r.json())
      .then((data: { groups?: ChannelGroup[]; error?: string }) => {
        if (data.error) {
          setFetchError(data.error);
        } else {
          setGroups(data.groups ?? []);
        }
      })
      .catch(() => setFetchError("Could not load Discord channels."))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [guildId, channelId] = e.target.value.split("|");
    const group = groups.find((g) => g.guildId === guildId);
    const channel = group?.channels.find((c) => c.id === channelId);
    setSelectedChannelId(channelId ?? "");
    setSelectedChannelName(channel ? `#${channel.name}` : "");
    setSelectedGuildName(group?.guildName ?? "");
  };

  const connect = () => {
    if (!selectedChannelId) return;
    setActionError(null);
    startTransition(async () => {
      const res = await fetch(`/api/lists/${slug}/discord-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannelId,
          channelName: selectedChannelName,
          guildName: selectedGuildName,
        }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setActionError(data.error ?? "Failed to connect channel.");
      }
    });
  };

  const disconnect = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await fetch(`/api/lists/${slug}/discord-webhook`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        setActionError(data.error ?? "Failed to disconnect.");
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
        Post to a Discord channel when items are added or a member marks
        something watched.
      </p>

      {isConnected ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm">
            <span className="font-medium">{connectedChannelName}</span>
            <span className="text-muted-foreground">
              {" "}
              in {connectedGuildName}
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={disconnect}
            disabled={isPending}
            className="text-destructive hover:text-destructive shrink-0"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <select
              value={
                selectedChannelId
                  ? `${selectedGuildName}|${selectedChannelId}`
                  : ""
              }
              onChange={handleSelect}
              disabled={loading || !!fetchError}
              className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">
                {loading
                  ? "Loading channels…"
                  : fetchError
                    ? "Could not load channels"
                    : groups.length === 0
                      ? "No servers found — add the bot to a server first"
                      : "Select a channel…"}
              </option>
              {groups.map((group) => (
                <optgroup key={group.guildId} label={group.guildName}>
                  {group.channels.map((ch) => (
                    <option key={ch.id} value={`${group.guildId}|${ch.id}`}>
                      #{ch.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            size="sm"
            onClick={connect}
            disabled={!selectedChannelId || isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Connect"
            )}
          </Button>
        </div>
      )}

      {actionError && (
        <p className="text-xs text-destructive mt-2">{actionError}</p>
      )}
    </div>
  );
}
