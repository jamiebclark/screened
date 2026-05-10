"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";

export function AdminInviteUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plexUsername, setPlexUsername] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plexUsername, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create invited user");
        return;
      }
      setPlexUsername("");
      setName("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Invite by Plex username
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Plex username</label>
        <Input
          value={plexUsername}
          onChange={(e) => setPlexUsername(e.target.value)}
          placeholder="e.g. johndoe"
          className="h-8 text-sm w-44"
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">
          Display name{" "}
          <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Defaults to Plex username"
          className="h-8 text-sm w-52"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading} className="h-8">
          {loading ? "Adding…" : "Add"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
      {error && <p className="text-xs text-destructive w-full">{error}</p>}
    </form>
  );
}
