"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  Unlink,
  ExternalLink,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DiscordSettingsProps {
  connection: {
    discordUsername: string;
    dmEnabled: boolean;
    createdAt: Date;
  } | null;
  features: {
    bot: boolean;
    oauth: boolean;
  };
}

export function DiscordSettings({
  connection: initialConnection,
  features,
}: DiscordSettingsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linked = searchParams.get("linked") === "1";
  const error = searchParams.get("error");

  const [connection, setConnection] = useState(initialConnection);
  const [isPending, startTransition] = useTransition();

  const unlink = () => {
    startTransition(async () => {
      await fetch("/api/discord/unlink", { method: "POST" });
      setConnection(null);
      router.replace("/settings/discord");
      router.refresh();
    });
  };

  const errorMessages: Record<string, string> = {
    invalid_state: "The OAuth state was invalid. Please try again.",
    token_exchange:
      "Failed to exchange the authorization code. Please try again.",
    user_fetch: "Could not fetch your Discord profile. Please try again.",
    not_configured: "Discord OAuth is not configured on this server.",
  };

  return (
    <div className="space-y-4">
      {linked && (
        <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400">
          Discord account connected successfully.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessages[error] ?? "An error occurred. Please try again."}
        </div>
      )}

      {/* Account linking card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#5865F2]" />
            Discord Account
          </CardTitle>
          <CardDescription>
            Link your Discord account to enable slash commands and direct
            message notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!features.oauth ? (
            <p className="text-sm text-muted-foreground">
              Discord OAuth is not configured on this server. Set{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                DISCORD_CLIENT_ID
              </code>{" "}
              and{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                DISCORD_CLIENT_SECRET
              </code>{" "}
              to enable account linking.
            </p>
          ) : connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Connected as @{connection.discordUsername}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Linked {new Date(connection.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={unlink}
                disabled={isPending}
                className="text-destructive hover:text-destructive"
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
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No Discord account connected. Click below to authorize with
                Discord.
              </p>
              <Button asChild>
                <a href="/api/discord/link">
                  <ExternalLink className="h-4 w-4" />
                  Connect Discord
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bot / slash commands info card */}
      {features.bot && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Slash Commands</CardTitle>
            <CardDescription>
              Use these commands in any Discord server where the bot is present.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  /whats-new
                </code>
                <span className="text-muted-foreground ml-2">
                  See what your friends watched recently
                </span>
              </li>
              <li>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  /pick
                </code>
                <span className="text-muted-foreground ml-2">
                  Get a random pick from your watchlist
                </span>
              </li>
              <li>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  /link
                </code>
                <span className="text-muted-foreground ml-2">
                  Get a link to connect your account
                </span>
              </li>
            </ul>
            {!connection && (
              <p className="text-xs text-muted-foreground mt-3">
                Connect your Discord account above for personalised results.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Webhook info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Webhooks</CardTitle>
          <CardDescription>
            Post activity to a Discord channel when list items are added or
            watched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure per-list Discord webhooks from each list{"'"}s settings.
            Only list owners can set a webhook URL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
