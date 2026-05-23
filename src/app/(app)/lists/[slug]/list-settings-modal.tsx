"use client";

import Link from "next/link";
import { useState } from "react";
import { Settings, Film, UserPlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CopyButton } from "@/components/copy-button";
import { LetterboxdImportDialog } from "@/components/letterboxd-import-dialog";
import { ListSettingsPanel } from "./list-settings-panel";
import { InviteMemberForm } from "./invite-member-form";
import { DiscordWebhookForm } from "./discord-webhook-form";

type MemberRecord = {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    status: string;
  };
};

interface ListSettingsModalProps {
  listSlug: string;
  isOwner: boolean;
  // Feature flags (owner settings)
  rankingEnabled: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  displayMode: "GRID" | "LIST";
  itemCap: number | null;
  // Members
  members: MemberRecord[];
  // Integrations
  radarrUrl: string;
  discordEnabled: boolean;
  connectedChannelName: string | null;
  connectedGuildName: string | null;
}

function IntegrationsSection({
  listSlug,
  radarrUrl,
  discordEnabled,
  connectedChannelName,
  connectedGuildName,
  isOwner,
}: {
  listSlug: string;
  radarrUrl: string;
  discordEnabled: boolean;
  connectedChannelName: string | null;
  connectedGuildName: string | null;
  isOwner: boolean;
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
          <Download className="h-4 w-4 text-primary" />
          Letterboxd
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Import films from your Letterboxd watchlist.
        </p>
        <LetterboxdImportDialog slug={listSlug} />
      </div>

      {isOwner && discordEnabled && (
        <div className="border-t border-border pt-5">
          <DiscordWebhookForm
            slug={listSlug}
            connectedChannelName={connectedChannelName}
            connectedGuildName={connectedGuildName}
          />
        </div>
      )}

      <div className="border-t border-border pt-5">
        <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
          <Film className="h-4 w-4 text-primary" />
          Radarr import URL
        </p>
        <p className="text-xs text-muted-foreground mb-2">
          Add this URL as a &quot;Custom List&quot; in Radarr to auto-import
          movies from this list.
        </p>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all block flex-1 min-w-0">
            {radarrUrl}
          </code>
          <CopyButton text={radarrUrl} />
        </div>
      </div>
    </div>
  );
}

export function ListSettingsModal({
  listSlug,
  isOwner,
  rankingEnabled,
  votingEnabled,
  commentsEnabled,
  displayMode,
  itemCap,
  members,
  radarrUrl,
  discordEnabled,
  connectedChannelName,
  connectedGuildName,
}: ListSettingsModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 shrink-0"
      >
        <Settings className="h-4 w-4" />
        {isOwner ? "Settings" : "Integrations"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-0 shrink-0">
            <DialogTitle>
              {isOwner ? "List settings" : "Integrations"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 pb-5 pt-3">
            {isOwner ? (
              <Tabs defaultValue="settings">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="settings" className="flex-1">
                    Settings
                  </TabsTrigger>
                  <TabsTrigger value="members" className="flex-1">
                    Members
                  </TabsTrigger>
                  <TabsTrigger value="integrations" className="flex-1">
                    Integrations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="settings">
                  <ListSettingsPanel
                    listSlug={listSlug}
                    rankingEnabled={rankingEnabled}
                    votingEnabled={votingEnabled}
                    commentsEnabled={commentsEnabled}
                    displayMode={displayMode}
                    itemCap={itemCap}
                  />
                </TabsContent>

                <TabsContent value="members">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                        <UserPlus className="h-4 w-4 text-primary" />
                        Invite collaborators
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Members can add items and vote.
                      </p>
                      <InviteMemberForm slug={listSlug} />
                    </div>

                    {members.length > 0 && (
                      <ul className="space-y-2 border-t border-border pt-4">
                        {members.map((m) => {
                          const isInvited = m.user.status === "INVITED";
                          return (
                            <li
                              key={m.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage
                                  src={m.user.avatarUrl ?? undefined}
                                />
                                <AvatarFallback className="text-[9px]">
                                  {m.user.name?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isInvited ? (
                                <span className="flex-1 truncate text-sm text-muted-foreground">
                                  {m.user.name}
                                </span>
                              ) : (
                                <Link
                                  href={`/profile/${m.user.id}`}
                                  className="flex-1 truncate text-sm hover:underline"
                                  onClick={() => setOpen(false)}
                                >
                                  {m.user.name}
                                </Link>
                              )}
                              {isInvited ? (
                                <span className="text-xs font-medium text-amber-600 shrink-0">
                                  pending
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground capitalize shrink-0">
                                  {m.role.toLowerCase()}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="integrations">
                  <IntegrationsSection
                    listSlug={listSlug}
                    radarrUrl={radarrUrl}
                    discordEnabled={discordEnabled}
                    connectedChannelName={connectedChannelName}
                    connectedGuildName={connectedGuildName}
                    isOwner={isOwner}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <IntegrationsSection
                listSlug={listSlug}
                radarrUrl={radarrUrl}
                discordEnabled={discordEnabled}
                connectedChannelName={connectedChannelName}
                connectedGuildName={connectedGuildName}
                isOwner={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
