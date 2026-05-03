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
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MediaItemSnap = {
  tmdbId: number;
  type: "MOVIE" | "TV";
  title: string;
  poster: string | null;
  year: number | null;
};

type UserSnap = { id: string; name: string; avatarUrl: string | null };

type InviteSnap = {
  id: string;
  userId: string;
  status: string;
  user: UserSnap;
};

type HostedParty = {
  id: string;
  scheduledFor: Date;
  status: string;
  mediaItem: MediaItemSnap;
  invites: InviteSnap[];
};

type InvitedRow = {
  id: string;
  status: string;
  watchParty: {
    id: string;
    scheduledFor: Date;
    status: string;
    host: UserSnap;
    mediaItem: MediaItemSnap;
    invites: InviteSnap[];
  };
};

function posterSrc(path: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w92${path}`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadge(status: string) {
  if (status === "CONFIRMED")
    return <Badge className="bg-green-600 text-white text-xs">Confirmed</Badge>;
  if (status === "CANCELLED")
    return (
      <Badge variant="destructive" className="text-xs">
        Cancelled
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      Scheduled
    </Badge>
  );
}

function inviteStatusBadge(status: string) {
  if (status === "ACCEPTED")
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" /> Accepted
      </span>
    );
  if (status === "DECLINED")
    return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <XCircle className="h-3 w-3" /> Declined
      </span>
    );
  return <span className="text-xs text-muted-foreground">Pending</span>;
}

function PartyCard({
  partyId,
  scheduledFor,
  status,
  mediaItem,
  invites,
  hostOrInviteLabel,
  myInviteStatus,
}: {
  partyId: string;
  scheduledFor: Date;
  status: string;
  mediaItem: MediaItemSnap;
  invites: InviteSnap[];
  hostOrInviteLabel: React.ReactNode;
  myInviteStatus?: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [responding, setResponding] = useState(false);
  const poster = posterSrc(mediaItem.poster);
  const titlePath = mediaItem.type === "MOVIE" ? "movies" : "tv";

  const respond = async (status: "ACCEPTED" | "DECLINED") => {
    setResponding(true);
    try {
      await fetch(`/api/watch-parties/${partyId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex gap-3">
        <Link href={`/${titlePath}/${mediaItem.tmdbId}`} className="shrink-0">
          {poster ? (
            <Image
              src={poster}
              alt={mediaItem.title}
              width={48}
              height={72}
              className="rounded object-cover hover:opacity-80 transition-opacity"
            />
          ) : (
            <div className="w-12 h-18 rounded bg-muted flex items-center justify-center">
              <Film className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <Link
                href={`/watch-parties/${partyId}`}
                className="font-semibold hover:underline"
              >
                {mediaItem.title}
                {mediaItem.year ? ` (${mediaItem.year})` : ""}
              </Link>
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatDate(scheduledFor)}
              </div>
            </div>
            {statusBadge(status)}
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {hostOrInviteLabel}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {invites.length + 1}{" "}
              {invites.length + 1 === 1 ? "person" : "people"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 mt-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                title={inv.user.name}
                className={cn(
                  "rounded-full ring-2",
                  inv.status === "ACCEPTED"
                    ? "ring-green-500"
                    : inv.status === "DECLINED"
                      ? "ring-red-400"
                      : "ring-muted",
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={inv.user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {inv.user.name[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
          </div>
        </div>
      </div>

      {myInviteStatus === "PENDING" && status === "SCHEDULED" && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => respond("ACCEPTED")}
            disabled={responding}
            className="h-7 text-xs"
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => respond("DECLINED")}
            disabled={responding}
            className="h-7 text-xs"
          >
            Decline
          </Button>
        </div>
      )}

      {myInviteStatus && myInviteStatus !== "PENDING" && (
        <div className="pt-1">{inviteStatusBadge(myInviteStatus)}</div>
      )}
    </div>
  );
}

export function WatchPartiesList({
  hosted,
  invited,
  currentUserId,
}: {
  hosted: HostedParty[];
  invited: InvitedRow[];
  currentUserId: string;
}) {
  const upcoming = hosted.filter(
    (p) => p.status === "SCHEDULED" && new Date(p.scheduledFor) >= new Date(),
  );
  const past = [
    ...hosted.filter(
      (p) => p.status !== "SCHEDULED" || new Date(p.scheduledFor) < new Date(),
    ),
  ];

  const invitedUpcoming = invited.filter(
    (i) =>
      i.watchParty.status === "SCHEDULED" &&
      new Date(i.watchParty.scheduledFor) >= new Date(),
  );
  const invitedPast = invited.filter(
    (i) =>
      i.watchParty.status !== "SCHEDULED" ||
      new Date(i.watchParty.scheduledFor) < new Date(),
  );

  if (hosted.length === 0 && invited.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <PartyPopper className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">No watch parties yet.</p>
        <p className="text-sm text-muted-foreground">
          Start one from any movie or TV show page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(upcoming.length > 0 || invitedUpcoming.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Upcoming</h3>
          {upcoming.map((p) => (
            <PartyCard
              key={p.id}
              partyId={p.id}
              scheduledFor={p.scheduledFor}
              status={p.status}
              mediaItem={p.mediaItem}
              invites={p.invites}
              currentUserId={currentUserId}
              hostOrInviteLabel={
                <span className="font-medium text-foreground">Hosting</span>
              }
            />
          ))}
          {invitedUpcoming.map((i) => (
            <PartyCard
              key={i.watchParty.id}
              partyId={i.watchParty.id}
              scheduledFor={i.watchParty.scheduledFor}
              status={i.watchParty.status}
              mediaItem={i.watchParty.mediaItem}
              invites={i.watchParty.invites}
              currentUserId={currentUserId}
              myInviteStatus={i.status}
              hostOrInviteLabel={
                <span>
                  Hosted by{" "}
                  <span className="font-medium text-foreground">
                    {i.watchParty.host.name}
                  </span>
                </span>
              }
            />
          ))}
        </section>
      )}

      {(past.length > 0 || invitedPast.length > 0) && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-muted-foreground">
            Past
          </h3>
          {past.map((p) => (
            <PartyCard
              key={p.id}
              partyId={p.id}
              scheduledFor={p.scheduledFor}
              status={p.status}
              mediaItem={p.mediaItem}
              invites={p.invites}
              currentUserId={currentUserId}
              hostOrInviteLabel={
                <span className="font-medium text-foreground">Hosting</span>
              }
            />
          ))}
          {invitedPast.map((i) => (
            <PartyCard
              key={i.watchParty.id}
              partyId={i.watchParty.id}
              scheduledFor={i.watchParty.scheduledFor}
              status={i.watchParty.status}
              mediaItem={i.watchParty.mediaItem}
              invites={i.watchParty.invites}
              currentUserId={currentUserId}
              myInviteStatus={i.status}
              hostOrInviteLabel={
                <span>
                  Hosted by{" "}
                  <span className="font-medium text-foreground">
                    {i.watchParty.host.name}
                  </span>
                </span>
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}
