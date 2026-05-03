"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Film,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  PartyPopper,
  Trash2,
  Loader2,
  CalendarCheck,
  CalendarPlus,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserSnap = { id: string; name: string; avatarUrl: string | null };

type InviteSnap = {
  id: string;
  userId: string;
  status: string;
  user: UserSnap;
};

type Party = {
  id: string;
  hostId: string;
  scheduledFor: Date;
  status: string;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  host: UserSnap;
  mediaItem: {
    id: string;
    tmdbId: number;
    type: "MOVIE" | "TV";
    title: string;
    poster: string | null;
    year: number | null;
  };
  invites: InviteSnap[];
};

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function posterSrc(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w185${path}`;
}

function InviteRow({ invite }: { invite: InviteSnap }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={invite.user.avatarUrl ?? undefined} />
          <AvatarFallback>{invite.user.name[0]}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{invite.user.name}</span>
      </div>
      {invite.status === "ACCEPTED" ? (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
        </span>
      ) : invite.status === "DECLINED" ? (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <XCircle className="h-3.5 w-3.5" /> Declined
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Pending
        </span>
      )}
    </div>
  );
}

export function WatchPartyDetail({
  party,
  currentUserId,
  feedUrl,
}: {
  party: Party;
  currentUserId: string;
  feedUrl: string;
}) {
  const router = useRouter();
  const isHost = party.hostId === currentUserId;
  const myInvite = party.invites.find((i) => i.userId === currentUserId);
  const isPast = new Date(party.scheduledFor) < new Date();
  const isScheduled = party.status === "SCHEDULED";
  const titlePath = party.mediaItem.type === "MOVIE" ? "movies" : "tv";
  const poster = posterSrc(party.mediaItem.poster);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const webcalUrl = feedUrl.replace(/^https?:\/\//, "webcal://");
  const copyFeedUrl = async () => {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const [newDate, setNewDate] = useState("");
  const [responding, setResponding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const respond = async (status: "ACCEPTED" | "DECLINED") => {
    setResponding(true);
    try {
      await fetch(`/api/watch-parties/${party.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setResponding(false);
    }
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      await fetch(`/api/watch-parties/${party.id}/confirm`, {
        method: "POST",
      });
      router.refresh();
    } finally {
      setConfirming(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/watch-parties/${party.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      router.refresh();
    } finally {
      setCancelling(false);
    }
  };

  const reschedule = async () => {
    if (!newDate) return;
    setRescheduling(true);
    try {
      await fetch(`/api/watch-parties/${party.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: new Date(newDate).toISOString() }),
      });
      setRescheduleOpen(false);
      router.refresh();
    } finally {
      setRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex gap-4">
        <Link
          href={`/${titlePath}/${party.mediaItem.tmdbId}`}
          className="shrink-0"
        >
          {poster ? (
            <Image
              src={poster}
              alt={party.mediaItem.title}
              width={80}
              height={120}
              className="rounded object-cover hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-20 h-30 rounded bg-muted flex items-center justify-center">
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-xl font-bold">
                <Link
                  href={`/${titlePath}/${party.mediaItem.tmdbId}`}
                  className="hover:underline"
                >
                  {party.mediaItem.title}
                  {party.mediaItem.year ? ` (${party.mediaItem.year})` : ""}
                </Link>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Hosted by{" "}
                <Link
                  href={`/profile/${party.host.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {party.host.name}
                </Link>
              </p>
            </div>

            {party.status === "CONFIRMED" && (
              <Badge className="bg-green-600 text-white">Confirmed</Badge>
            )}
            {party.status === "CANCELLED" && (
              <Badge variant="destructive">Cancelled</Badge>
            )}
            {party.status === "SCHEDULED" && (
              <Badge variant="secondary">Scheduled</Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {formatDate(party.scheduledFor)}
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {party.invites.length + 1} participant
            {party.invites.length + 1 !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Invitee respond actions */}
      {myInvite && myInvite.status === "PENDING" && isScheduled && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium">You&apos;ve been invited!</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => respond("ACCEPTED")}
              disabled={responding}
              className="gap-1.5"
            >
              {responding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respond("DECLINED")}
              disabled={responding}
              className="gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5" />
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Host: confirm / reschedule / cancel */}
      {isHost && isScheduled && isPast && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <PartyPopper className="h-4 w-4 text-yellow-600" />
            Did the watch party happen?
          </p>
          <p className="text-xs text-muted-foreground">
            Confirm to log this as watched for everyone who accepted.
          </p>
          <Button
            size="sm"
            onClick={confirm}
            disabled={confirming}
            className="gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            {confirming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarCheck className="h-3.5 w-3.5" />
            )}
            Yes, we watched it!
          </Button>
        </div>
      )}

      {party.status === "CONFIRMED" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Confirmed — logged as watched for all participants
          </p>
        </div>
      )}

      {/* Participants */}
      <section className="space-y-1">
        <h3 className="text-base font-semibold">Participants</h3>
        <div className="rounded-lg border border-border divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={party.host.avatarUrl ?? undefined} />
                <AvatarFallback>{party.host.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <span className="text-sm font-medium">{party.host.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">Host</span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Going
            </span>
          </div>
          {party.invites.map((invite) => (
            <div key={invite.id} className="px-4">
              <InviteRow invite={invite} />
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarPlus className="h-3.5 w-3.5" />
              Subscribe to Calendar
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <p className="text-sm font-medium mb-1">
              Live calendar subscription
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Subscribe once and your calendar stays in sync — reschedules and
              cancellations update automatically.
            </p>
            <div className="space-y-2">
              <Button size="sm" className="w-full gap-1.5" asChild>
                <a href={webcalUrl}>
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Subscribe (Apple / Outlook)
                </a>
              </Button>
              <div className="flex gap-1.5">
                <Input
                  readOnly
                  value={feedUrl}
                  className="font-mono text-xs h-8"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={copyFeedUrl}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                For Google Calendar: Other calendars → From URL → paste above.
              </p>
            </div>
          </PopoverContent>
        </Popover>

        {isHost && isScheduled && !isPast && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRescheduleOpen(true)}
              className="gap-1.5"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Reschedule
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancel}
              disabled={cancelling}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              {cancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Cancel Party
            </Button>
          </>
        )}
      </div>

      {/* Reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Watch Party</DialogTitle>
            <DialogDescription>
              Pick a new date and time for the party.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-date">New date & time</Label>
            <Input
              id="new-date"
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={reschedule} disabled={!newDate || rescheduling}>
              {rescheduling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reschedule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
