"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ListSettingsPanelProps {
  listSlug: string;
  rankingEnabled: boolean;
  votingEnabled: boolean;
  commentsEnabled: boolean;
  displayMode: "GRID" | "LIST";
  itemCap: number | null;
}

export function ListSettingsPanel({
  listSlug,
  rankingEnabled: initialRanking,
  votingEnabled: initialVoting,
  commentsEnabled: initialComments,
  displayMode: initialDisplayMode,
  itemCap: initialItemCap,
}: ListSettingsPanelProps) {
  const router = useRouter();
  const [rankingEnabled, setRankingEnabled] = useState(initialRanking);
  const [votingEnabled, setVotingEnabled] = useState(initialVoting);
  const [commentsEnabled, setCommentsEnabled] = useState(initialComments);
  const [displayMode, setDisplayMode] = useState<"GRID" | "LIST">(
    initialDisplayMode,
  );
  const [itemCap, setItemCap] = useState<string>(
    initialItemCap !== null ? String(initialItemCap) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRankingChange = (checked: boolean) => {
    setRankingEnabled(checked);
    if (checked) setVotingEnabled(false);
  };

  const handleVotingChange = (checked: boolean) => {
    setVotingEnabled(checked);
    if (checked) setRankingEnabled(false);
  };

  const isDirty =
    rankingEnabled !== initialRanking ||
    votingEnabled !== initialVoting ||
    commentsEnabled !== initialComments ||
    displayMode !== initialDisplayMode ||
    (itemCap === "" ? null : Number(itemCap)) !== initialItemCap;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const parsedCap =
      itemCap.trim() === "" ? null : parseInt(itemCap.trim(), 10);
    if (itemCap.trim() !== "" && (isNaN(parsedCap!) || parsedCap! < 1)) {
      setError("Item cap must be a positive number or empty");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/lists/${listSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rankingEnabled,
          votingEnabled,
          commentsEnabled,
          displayMode,
          itemCap: parsedCap,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to save settings");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
        <Settings className="h-4 w-4 text-primary" />
        List settings
      </p>

      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Checkbox
            id="ranking-toggle"
            checked={rankingEnabled}
            onCheckedChange={(v) => handleRankingChange(v === true)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <Label
              htmlFor="ranking-toggle"
              className="text-xs font-medium cursor-pointer"
            >
              Ranking
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Numbered positions, drag to reorder
            </p>
            {rankingEnabled && initialVoting && !votingEnabled && (
              <p className="text-[11px] text-amber-600">
                Voting will be disabled
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="voting-toggle"
            checked={votingEnabled}
            onCheckedChange={(v) => handleVotingChange(v === true)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <Label
              htmlFor="voting-toggle"
              className="text-xs font-medium cursor-pointer"
            >
              Voting
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Members can upvote / downvote
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="comments-toggle"
            checked={commentsEnabled}
            onCheckedChange={(v) => setCommentsEnabled(v === true)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <Label
              htmlFor="comments-toggle"
              className="text-xs font-medium cursor-pointer"
            >
              Comments
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Members can comment on items
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">Display mode</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["GRID", "LIST"] as const).map((mode) => (
              <label key={mode} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="displayMode"
                  value={mode}
                  checked={displayMode === mode}
                  onChange={() => setDisplayMode(mode)}
                  className="peer sr-only"
                />
                <div className="rounded-md border border-border bg-muted p-2 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all text-xs font-medium">
                  {mode === "GRID" ? "Grid" : "List"}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="item-cap" className="text-xs font-medium">
            Item cap
          </Label>
          <Input
            id="item-cap"
            type="number"
            min={1}
            placeholder="No limit"
            value={itemCap}
            onChange={(e) => setItemCap(e.target.value)}
            className="h-7 text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Max items allowed (leave blank for no limit)
          </p>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {isDirty && (
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Save settings
        </Button>
      )}
    </div>
  );
}
