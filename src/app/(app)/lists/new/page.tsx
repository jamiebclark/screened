"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ListVideo, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  LIST_PRESETS,
  type ListPreset,
  type ListFeatureFlags,
} from "@/lib/list-presets";

const PRESET_OPTIONS: { value: ListPreset; label: string; desc: string }[] = [
  {
    value: "watchlist",
    label: "Watchlist",
    desc: "Simple shared list, no voting or ranking",
  },
  {
    value: "poll",
    label: "Poll",
    desc: "Members vote to decide what to watch",
  },
  {
    value: "ranked",
    label: "Ranked",
    desc: "Ordered list with drag-to-reorder positions",
  },
  {
    value: "custom",
    label: "Custom",
    desc: "Configure each setting yourself",
  },
];

export default function NewListPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ListPreset>("watchlist");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [flags, setFlags] = useState<ListFeatureFlags>(
    LIST_PRESETS["watchlist"],
  );

  const handlePresetChange = (preset: ListPreset) => {
    setSelectedPreset(preset);
    setFlags(LIST_PRESETS[preset]);
  };

  const handleFlagChange = (
    key: keyof ListFeatureFlags,
    value: boolean | "GRID" | "LIST",
  ) => {
    setFlags((prev) => {
      const next = { ...prev, [key]: value };
      // Enforce mutex
      if (key === "rankingEnabled" && value === true)
        next.votingEnabled = false;
      if (key === "votingEnabled" && value === true)
        next.rankingEnabled = false;
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name") as string,
      description: form.get("description") as string,
      isPublic: form.get("visibility") !== "private",
      preset: selectedPreset,
      ...flags,
    };

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to create list");
        setLoading(false);
        return;
      }

      const list = (await res.json()) as { slug: string };
      router.push(`/lists/${list.slug}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="rounded-full bg-primary/10 p-3">
          <ListVideo className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">New list</h1>
          <p className="text-muted-foreground text-sm">
            Create a collaborative movie list
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-6 space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Preset selector */}
            <div className="space-y-2">
              <Label>List type</Label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_OPTIONS.map(({ value, label, desc }) => (
                  <label key={value} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="preset"
                      value={value}
                      checked={selectedPreset === value}
                      onChange={() => handlePresetChange(value)}
                      className="peer sr-only"
                    />
                    <div className="rounded-lg border border-border bg-muted p-3 peer-checked:border-primary peer-checked:bg-primary/10 transition-all">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">List name</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Friday Night Movies"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="What's this list for?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "public", label: "Public", desc: "Anyone can view" },
                  { value: "private", label: "Private", desc: "Only members" },
                ].map(({ value, label, desc }) => (
                  <label key={value} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value={value}
                      defaultChecked={value === "public"}
                      className="peer sr-only"
                    />
                    <div className="rounded-lg border border-border bg-muted p-3 peer-checked:border-primary peer-checked:bg-primary/10 transition-all">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Advanced settings */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAdvanced ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                Advanced settings
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="adv-ranking"
                      checked={flags.rankingEnabled}
                      onCheckedChange={(v) =>
                        handleFlagChange("rankingEnabled", v === true)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <Label
                        htmlFor="adv-ranking"
                        className="text-xs font-medium cursor-pointer"
                      >
                        Ranking
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Numbered positions, drag to reorder
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="adv-voting"
                      checked={flags.votingEnabled}
                      onCheckedChange={(v) =>
                        handleFlagChange("votingEnabled", v === true)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <Label
                        htmlFor="adv-voting"
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
                      id="adv-comments"
                      checked={flags.commentsEnabled}
                      onCheckedChange={(v) =>
                        handleFlagChange("commentsEnabled", v === true)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <Label
                        htmlFor="adv-comments"
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
                            name="advancedDisplayMode"
                            value={mode}
                            checked={flags.displayMode === mode}
                            onChange={() =>
                              handleFlagChange("displayMode", mode)
                            }
                            className="peer sr-only"
                          />
                          <div className="rounded-md border border-border bg-muted p-2 text-center peer-checked:border-primary peer-checked:bg-primary/10 transition-all text-xs font-medium">
                            {mode === "GRID" ? "Grid" : "List"}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create list
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
