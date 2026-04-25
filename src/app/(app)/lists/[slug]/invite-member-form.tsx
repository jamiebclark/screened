"use client";

import { useState, FormEvent, useTransition } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface InviteMemberFormProps {
  slug: string;
}

export function InviteMemberForm({ slug }: InviteMemberFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/lists/${slug}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: "CONTRIBUTOR" }),
        });

        if (!res.ok) {
          const data = await res.json() as { error?: string };
          setError(data.error ?? "Failed to invite");
          return;
        }

        const member = await res.json() as { user: { name: string } };
        setSuccess(`${member.user.name} has been added to the list`);
        (e.target as HTMLFormElement).reset();
      } catch {
        setError("Something went wrong");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite to list</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400">
            {success}
          </div>
        ) : null}

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">User email</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="friend@example.com"
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send invite
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
