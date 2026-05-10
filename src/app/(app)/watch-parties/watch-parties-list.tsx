"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Film,
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
  return `https://image.tmdb.org/t/p/w342${path}`;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadge(status: string) {
  if (status === "CONFIRMED")
    return (
      <Badge className="bg-green-600/90 text-white text-xs backdrop-blur-sm border-0">
        Confirmed
      </Badge>
    );
  if (status === "CANCELLED")
    return (
      <Badge
        variant="destructive"
        className="text-xs backdrop-blur-sm opacity-90 border-0"
      >
        Cancelled
      </Badge>
    );
  return (
    <Badge className="text-xs bg-black/50 text-white/90 border border-white/15 backdrop-blur-sm">
      Scheduled
    </Badge>
  );
}

function inviteStatusBadge(status: string) {
  if (status === "ACCEPTED")
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Accepted
      </span>
    );
  if (status === "DECLINED")
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <XCircle className="h-3 w-3" /> Declined
      </span>
    );
  return <span className="text-xs text-white/50">Pending</span>;
}

function PartyCard({
  partyId,
  scheduledFor,
  status,
  mediaItem,
  invites,
  hostOrInviteLabel,
  myInviteStatus,
  isPast,
}: {
  partyId: string;
  scheduledFor: Date;
  status: string;
  mediaItem: MediaItemSnap;
  invites: InviteSnap[];
  hostOrInviteLabel: React.ReactNode;
  myInviteStatus?: string;
  currentUserId: string;
  isPast?: boolean;
}) {
  const router = useRouter();
  const [responding, setResponding] = useState(false);
  const poster = posterSrc(mediaItem.poster);

  const respond = async (rsvpStatus: "ACCEPTED" | "DECLINED") => {
    setResponding(true);
    try {
      await fetch(`/api/watch-parties/${partyId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: rsvpStatus }),
      });
      router.refresh();
    } finally {
      setResponding(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900",
        isPast && "opacity-60",
      )}
    >
      {/* Poster */}
      {poster ? (
        <Image
          src={poster}
          alt={mediaItem.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 342px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
          <Film className="h-12 w-12 text-zinc-600" />
        </div>
      )}

      {/* Bottom gradient overlay — z-auto (sits below the full-card link) */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-4 pb-4 pt-20">
        <p className="text-sm font-semibold text-white leading-snug">
          {mediaItem.title}
          {mediaItem.year ? (
            <span className="font-normal text-white/55">
              {" "}
              ({mediaItem.year})
            </span>
          ) : null}
        </p>

        <div className="flex items-center gap-1.5 mt-1 text-white/55 text-xs">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>{formatDate(scheduledFor)}</span>
        </div>

        <div className="flex items-center justify-between mt-2.5 gap-2">
          <div className="text-xs text-white/45 truncate min-w-0">
            {hostOrInviteLabel}
          </div>
          {invites.length > 0 && (
            <div className="flex shrink-0 -space-x-1.5">
              {invites.slice(0, 5).map((inv) => (
                <div
                  key={inv.id}
                  title={`${inv.user.name} — ${inv.status.toLowerCase()}`}
                  className={cn(
                    "rounded-full ring-1",
                    inv.status === "ACCEPTED"
                      ? "ring-green-400"
                      : inv.status === "DECLINED"
                        ? "ring-red-400"
                        : "ring-white/20",
                  )}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={inv.user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-zinc-700 text-zinc-300">
                      {inv.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ))}
              {invites.length > 5 && (
                <div className="h-5 w-5 rounded-full bg-zinc-700/80 ring-1 ring-white/20 flex items-center justify-center">
                  <span className="text-[9px] text-zinc-300">
                    +{invites.length - 5}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RSVP buttons — z-[2] so they sit above the full-card link */}
        {myInviteStatus === "PENDING" && status === "SCHEDULED" && (
          <div className="flex gap-2 mt-3 relative z-[2]">
            <Button
              size="sm"
              onClick={() => respond("ACCEPTED")}
              disabled={responding}
              className="flex-1 h-8 text-xs"
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respond("DECLINED")}
              disabled={responding}
              className="flex-1 h-8 text-xs bg-transparent text-white border-white/25 hover:bg-white/10 hover:text-white"
            >
              Decline
            </Button>
          </div>
        )}

        {myInviteStatus && myInviteStatus !== "PENDING" && (
          <div className="mt-2.5">{inviteStatusBadge(myInviteStatus)}</div>
        )}
      </div>

      {/* Status badge — pointer-events-none so clicks pass through to the card link */}
      <div className="absolute top-3 right-3 pointer-events-none">
        {statusBadge(status)}
      </div>

      {/* Full-card navigation link — z-[1] sits above poster/overlay, below RSVP buttons */}
      <Link
        href={`/watch-parties/${partyId}`}
        className="absolute inset-0 z-[1]"
        aria-label={`${mediaItem.title} watch party`}
      />
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
        <section className="space-y-4">
          <h3 className="text-base font-semibold">Upcoming</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {upcoming.map((p) => (
              <PartyCard
                key={p.id}
                partyId={p.id}
                scheduledFor={p.scheduledFor}
                status={p.status}
                mediaItem={p.mediaItem}
                invites={p.invites}
                currentUserId={currentUserId}
                hostOrInviteLabel="Hosting"
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
                  <>
                    Hosted by{" "}
                    <Link
                      href={`/profile/${i.watchParty.host.id}`}
                      className="relative z-[2] hover:underline"
                    >
                      {i.watchParty.host.name}
                    </Link>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {(past.length > 0 || invitedPast.length > 0) && (
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-muted-foreground">
            Past
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {past.map((p) => (
              <PartyCard
                key={p.id}
                partyId={p.id}
                scheduledFor={p.scheduledFor}
                status={p.status}
                mediaItem={p.mediaItem}
                invites={p.invites}
                currentUserId={currentUserId}
                isPast
                hostOrInviteLabel="Hosting"
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
                isPast
                hostOrInviteLabel={
                  <>
                    Hosted by{" "}
                    <Link
                      href={`/profile/${i.watchParty.host.id}`}
                      className="relative z-[2] hover:underline"
                    >
                      {i.watchParty.host.name}
                    </Link>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
