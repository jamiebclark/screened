"use client";

import { useState } from "react";
import { Globe, Lock, Users, Plus, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ListSettingsModal } from "./list-settings-modal";
import { ListAddFab } from "./list-add-fab";

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

interface ListPageHeaderProps {
  listSlug: string;
  isOwner: boolean;
  isMember: boolean;
  isPublic: boolean;
  name: string;
  description: string | null;
  memberCount: number;
  itemCount: number;
  watchedCount: number;
  memberAvatars: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  }[];
  existingKeys: string[];
  // settings modal data
  rankingEnabled: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  displayMode: "GRID" | "LIST";
  itemCap: number | null;
  members: MemberRecord[];
  radarrUrl: string;
  discordEnabled: boolean;
  connectedChannelName: string | null;
  connectedGuildName: string | null;
}

export function ListPageHeader({
  listSlug,
  isOwner,
  isMember,
  isPublic,
  name,
  description,
  memberCount,
  itemCount,
  watchedCount,
  memberAvatars,
  existingKeys,
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
}: ListPageHeaderProps) {
  const hasSidebar = isMember || isOwner;
  const defaultTab = isOwner ? "settings" : "integrations";

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(defaultTab);
  const [addOpen, setAddOpen] = useState(false);

  const openSettings = (tab: string) => {
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-8">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {isPublic ? (
            <Globe className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {isPublic ? "Public" : "Private"} list
          </span>
        </div>
        <h1 className="text-3xl font-bold">{name}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex -space-x-2">
            {memberAvatars.map((m) => (
              <Avatar key={m.id} className="h-7 w-7 border-2 border-background">
                <AvatarImage src={m.avatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {m.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {isOwner ? (
            <button
              onClick={() => openSettings("members")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Users className="h-3.5 w-3.5" />
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </button>
          ) : (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </span>
          {watchedCount > 0 && (
            <span className="text-sm text-muted-foreground">
              · {watchedCount} in your watched history
            </span>
          )}
        </div>
      </div>

      {hasSidebar && (
        <div className="flex items-center gap-1 shrink-0">
          {isMember && (
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9"
              onClick={() => setAddOpen(true)}
              aria-label="Add item to list"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => openSettings(defaultTab)}
            aria-label={isOwner ? "List settings" : "Integrations"}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      )}

      {hasSidebar && (
        <ListSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          activeTab={settingsTab}
          onTabChange={setSettingsTab}
          listSlug={listSlug}
          isOwner={isOwner}
          rankingEnabled={rankingEnabled}
          votingEnabled={votingEnabled}
          commentsEnabled={commentsEnabled}
          displayMode={displayMode}
          itemCap={itemCap}
          members={members}
          radarrUrl={radarrUrl}
          discordEnabled={discordEnabled}
          connectedChannelName={connectedChannelName}
          connectedGuildName={connectedGuildName}
        />
      )}
      {isMember && (
        <ListAddFab
          open={addOpen}
          onOpenChange={setAddOpen}
          listSlug={listSlug}
          existingKeys={existingKeys}
        />
      )}
    </div>
  );
}
