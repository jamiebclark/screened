import { prisma } from "@/lib/prisma";
import { NotificationType, WatchEntrySource } from "@/generated/prisma";
import { listFriendUserIds } from "@/lib/friendship";
import { sendDM, discordFeatures } from "@/lib/discord";

export type WatchPartyWithDetails = Awaited<ReturnType<typeof getWatchParty>>;

export async function getWatchParty(id: string, viewerId: string) {
  const party = await prisma.watchParty.findUnique({
    where: { id },
    include: {
      host: { select: { id: true, name: true, avatarUrl: true } },
      mediaItem: {
        select: {
          id: true,
          tmdbId: true,
          type: true,
          title: true,
          poster: true,
          year: true,
        },
      },
      invites: {
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!party) return null;

  const isHost = party.hostId === viewerId;
  const isInvited = party.invites.some((i) => i.userId === viewerId);
  if (!isHost && !isInvited) return null;

  return party;
}

export async function listWatchPartiesForUser(userId: string) {
  const [hosted, invited] = await Promise.all([
    prisma.watchParty.findMany({
      where: { hostId: userId },
      include: {
        mediaItem: {
          select: {
            tmdbId: true,
            type: true,
            title: true,
            poster: true,
            year: true,
          },
        },
        invites: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { scheduledFor: "asc" },
    }),
    prisma.watchPartyInvite.findMany({
      where: { userId, watchParty: { hostId: { not: userId } } },
      include: {
        watchParty: {
          include: {
            host: { select: { id: true, name: true, avatarUrl: true } },
            mediaItem: {
              select: {
                tmdbId: true,
                type: true,
                title: true,
                poster: true,
                year: true,
              },
            },
            invites: {
              include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { watchParty: { scheduledFor: "asc" } },
    }),
  ]);

  return { hosted, invited };
}

export async function createWatchParty(
  hostId: string,
  mediaItemId: string,
  scheduledFor: Date,
  inviteeIds: string[],
  pickerSessionId?: string,
) {
  if (inviteeIds.includes(hostId)) {
    throw new Error("Host cannot be an invitee");
  }

  const friendIds = await listFriendUserIds(hostId);
  const friendSet = new Set(friendIds);
  const nonFriends = inviteeIds.filter((id) => !friendSet.has(id));
  if (nonFriends.length > 0) {
    throw new Error("All invitees must be friends");
  }

  const mediaItem = await prisma.mediaItem.findUnique({
    where: { id: mediaItemId },
    select: {
      id: true,
      tmdbId: true,
      type: true,
      title: true,
      year: true,
      poster: true,
    },
  });
  if (!mediaItem) throw new Error("Media item not found");

  const party = await prisma.$transaction(async (tx) => {
    const created = await tx.watchParty.create({
      data: {
        hostId,
        mediaItemId,
        scheduledFor,
        pickerSessionId: pickerSessionId ?? null,
        invites: {
          create: inviteeIds.map((userId) => ({ userId })),
        },
      },
      include: {
        invites: { select: { id: true, userId: true } },
        host: { select: { id: true, name: true } },
      },
    });

    await tx.notification.createMany({
      data: created.invites.map((invite) => ({
        userId: invite.userId,
        type: NotificationType.WATCH_PARTY_INVITE,
        watchPartyInviteId: invite.id,
      })),
      skipDuplicates: true,
    });

    return created;
  });

  if (discordFeatures().bot) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const titleLine = mediaItem.year
      ? `${mediaItem.title} (${mediaItem.year})`
      : mediaItem.title;
    const scheduled = scheduledFor.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const connections = await prisma.discordConnection.findMany({
      where: { userId: { in: inviteeIds }, dmEnabled: true },
      select: { discordUserId: true },
    });

    for (const { discordUserId } of connections) {
      await sendDM(discordUserId, {
        description: `**${party.host.name}** invited you to a Watch Party for **${titleLine}** on ${scheduled}`,
        color: 0xeb459e,
        url: `${appUrl}/watch-parties/${party.id}`,
        ...(mediaItem.poster && {
          thumbnail: {
            url: `https://image.tmdb.org/t/p/w185${mediaItem.poster}`,
          },
        }),
      });
    }
  }

  return party;
}

export async function addInvitesToWatchParty(
  partyId: string,
  hostId: string,
  inviteeIds: string[],
) {
  const party = await prisma.watchParty.findUnique({
    where: { id: partyId },
    select: {
      hostId: true,
      status: true,
      mediaItem: {
        select: {
          id: true,
          tmdbId: true,
          type: true,
          title: true,
          year: true,
          poster: true,
        },
      },
      host: { select: { name: true } },
      invites: { select: { userId: true } },
    },
  });
  if (!party) throw new Error("Watch party not found");
  if (party.hostId !== hostId) throw new Error("Only the host can invite");
  if (party.status !== "SCHEDULED") throw new Error("Party is not scheduled");

  if (inviteeIds.includes(hostId)) throw new Error("Host cannot be an invitee");

  const friendIds = await listFriendUserIds(hostId);
  const friendSet = new Set(friendIds);
  const nonFriends = inviteeIds.filter((id) => !friendSet.has(id));
  if (nonFriends.length > 0) throw new Error("All invitees must be friends");

  const existingIds = new Set(party.invites.map((i) => i.userId));
  const newIds = inviteeIds.filter((id) => !existingIds.has(id));
  if (newIds.length === 0) return [];

  const created = await prisma.$transaction(async (tx) => {
    const invites = await Promise.all(
      newIds.map((userId) =>
        tx.watchPartyInvite.create({ data: { watchPartyId: partyId, userId } }),
      ),
    );

    await tx.notification.createMany({
      data: invites.map((invite) => ({
        userId: invite.userId,
        type: NotificationType.WATCH_PARTY_INVITE,
        watchPartyInviteId: invite.id,
      })),
      skipDuplicates: true,
    });

    return invites;
  });

  if (discordFeatures().bot) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const titleLine = party.mediaItem.year
      ? `${party.mediaItem.title} (${party.mediaItem.year})`
      : party.mediaItem.title;
    const scheduled = party.mediaItem
      ? new Date().toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

    const connections = await prisma.discordConnection.findMany({
      where: { userId: { in: newIds }, dmEnabled: true },
      select: { discordUserId: true },
    });

    for (const { discordUserId } of connections) {
      await sendDM(discordUserId, {
        description: `**${party.host.name}** invited you to a Watch Party for **${titleLine}**${scheduled ? ` on ${scheduled}` : ""}`,
        color: 0xeb459e,
        url: `${appUrl}/watch-parties/${partyId}`,
        ...(party.mediaItem.poster && {
          thumbnail: {
            url: `https://image.tmdb.org/t/p/w185${party.mediaItem.poster}`,
          },
        }),
      });
    }
  }

  return created;
}

export async function respondToInvite(
  watchPartyId: string,
  userId: string,
  status: "ACCEPTED" | "DECLINED",
) {
  const invite = await prisma.watchPartyInvite.findUnique({
    where: { watchPartyId_userId: { watchPartyId, userId } },
  });
  if (!invite) throw new Error("Invite not found");

  return prisma.watchPartyInvite.update({
    where: { id: invite.id },
    data: { status, respondedAt: new Date() },
  });
}

export async function cancelWatchParty(partyId: string, hostId: string) {
  const party = await prisma.watchParty.findUnique({
    where: { id: partyId },
    select: { hostId: true, status: true },
  });
  if (!party) throw new Error("Watch party not found");
  if (party.hostId !== hostId) throw new Error("Only the host can cancel");
  if (party.status !== "SCHEDULED") throw new Error("Party is not scheduled");

  return prisma.watchParty.update({
    where: { id: partyId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export async function rescheduleWatchParty(
  partyId: string,
  hostId: string,
  scheduledFor: Date,
) {
  const party = await prisma.watchParty.findUnique({
    where: { id: partyId },
    select: { hostId: true, status: true },
  });
  if (!party) throw new Error("Watch party not found");
  if (party.hostId !== hostId) throw new Error("Only the host can reschedule");
  if (party.status !== "SCHEDULED") throw new Error("Party is not scheduled");

  return prisma.watchParty.update({
    where: { id: partyId },
    data: { scheduledFor },
  });
}

export async function confirmWatchParty(partyId: string, hostId: string) {
  const party = await prisma.watchParty.findUnique({
    where: { id: partyId },
    include: {
      invites: { where: { status: "ACCEPTED" }, select: { userId: true } },
      mediaItem: {
        select: {
          id: true,
          tmdbId: true,
          type: true,
          title: true,
          year: true,
          poster: true,
        },
      },
      host: { select: { name: true } },
    },
  });
  if (!party) throw new Error("Watch party not found");
  if (party.hostId !== hostId) throw new Error("Only the host can confirm");
  if (party.status !== "SCHEDULED") throw new Error("Party is not scheduled");

  const allParticipantIds = [hostId, ...party.invites.map((i) => i.userId)];
  const watchedAt = party.scheduledFor;

  await prisma.$transaction(async (tx) => {
    await tx.watchParty.update({
      where: { id: partyId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    for (const userId of allParticipantIds) {
      let mediaStatus = await tx.userMediaStatus.findUnique({
        where: {
          userId_mediaItemId: { userId, mediaItemId: party.mediaItem.id },
        },
      });

      if (!mediaStatus) {
        mediaStatus = await tx.userMediaStatus.create({
          data: {
            userId,
            mediaItemId: party.mediaItem.id,
            status: "WATCHED",
          },
        });
      } else if (mediaStatus.status !== "WATCHED") {
        await tx.userMediaStatus.update({
          where: { id: mediaStatus.id },
          data: { status: "WATCHED" },
        });
      }

      await tx.watchEntry.create({
        data: {
          userId,
          mediaItemId: party.mediaItem.id,
          userMediaStatusId: mediaStatus.id,
          source: WatchEntrySource.MANUAL,
          watchedAt,
        },
      });
    }
  });

  if (discordFeatures().bot) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const titleLine = party.mediaItem.year
      ? `${party.mediaItem.title} (${party.mediaItem.year})`
      : party.mediaItem.title;
    const path = party.mediaItem.type === "MOVIE" ? "movies" : "tv";

    const connections = await prisma.discordConnection.findMany({
      where: {
        userId: { in: party.invites.map((i) => i.userId) },
        dmEnabled: true,
      },
      select: { discordUserId: true },
    });

    for (const { discordUserId } of connections) {
      await sendDM(discordUserId, {
        description: `**${party.host.name}** confirmed your Watch Party for **${titleLine}** — logged as watched!`,
        color: 0x57f287,
        url: `${appUrl}/${path}/${party.mediaItem.tmdbId}`,
        ...(party.mediaItem.poster && {
          thumbnail: {
            url: `https://image.tmdb.org/t/p/w185${party.mediaItem.poster}`,
          },
        }),
      });
    }
  }
}

export async function sendConfirmationPrompts(): Promise<number> {
  const now = new Date();

  const parties = await prisma.watchParty.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lt: now },
    },
    include: {
      invites: {
        where: { status: "ACCEPTED" },
        select: { id: true, userId: true },
      },
    },
  });

  let notified = 0;
  for (const party of parties) {
    const hostNotifExists = await prisma.notification.findFirst({
      where: {
        userId: party.hostId,
        type: NotificationType.WATCH_PARTY_CONFIRM,
        watchPartyInviteId: null,
      },
    });

    if (!hostNotifExists) {
      const notifData: Array<{
        userId: string;
        type: typeof NotificationType.WATCH_PARTY_CONFIRM;
        watchPartyInviteId: string | null;
      }> = [
        {
          userId: party.hostId,
          type: NotificationType.WATCH_PARTY_CONFIRM,
          watchPartyInviteId: null,
        },
        ...party.invites.map((inv) => ({
          userId: inv.userId,
          type: NotificationType.WATCH_PARTY_CONFIRM as typeof NotificationType.WATCH_PARTY_CONFIRM,
          watchPartyInviteId: inv.id,
        })),
      ];

      await prisma.notification.createMany({
        data: notifData,
        skipDuplicates: true,
      });

      notified += notifData.length;
    }
  }

  return notified;
}

export function generateIcs(party: {
  id: string;
  scheduledFor: Date;
  mediaItem: { title: string; year: number | null };
  host: { name: string };
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(party.scheduledFor);
  const dtEnd = formatIcsDate(
    new Date(party.scheduledFor.getTime() + 2 * 60 * 60 * 1000),
  );
  const title = party.mediaItem.year
    ? `${party.mediaItem.title} (${party.mediaItem.year})`
    : party.mediaItem.title;
  const uid = `watch-party-${party.id}@screened`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Screened//Watch Party//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Watch Party: ${escapeIcs(title)}`,
    `DESCRIPTION:Hosted by ${escapeIcs(party.host.name)}. ${appUrl}/watch-parties/${party.id}`,
    `URL:${appUrl}/watch-parties/${party.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export interface WatchPartyCalendarItem {
  id: string;
  scheduledFor: Date;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED";
  isHost: boolean;
  mediaItem: {
    title: string;
    year: number | null;
    tmdbId: number;
    type: "MOVIE" | "TV";
    poster: string | null;
  };
  host: { name: string };
}

/** SCHEDULED parties in [start, end] where the user is host or has an accepted invite. */
export async function fetchWatchPartiesInMonth(
  userId: string,
  start: Date,
  end: Date,
): Promise<WatchPartyCalendarItem[]> {
  const parties = await prisma.watchParty.findMany({
    where: {
      scheduledFor: { gte: start, lte: end },
      status: { not: "CANCELLED" },
      OR: [
        { hostId: userId },
        { invites: { some: { userId, status: "ACCEPTED" } } },
      ],
    },
    select: {
      id: true,
      scheduledFor: true,
      status: true,
      hostId: true,
      mediaItem: {
        select: {
          title: true,
          year: true,
          tmdbId: true,
          type: true,
          poster: true,
        },
      },
      host: { select: { name: true } },
    },
    orderBy: { scheduledFor: "asc" },
  });
  return parties.map((p) => ({
    id: p.id,
    scheduledFor: p.scheduledFor,
    status: p.status as WatchPartyCalendarItem["status"],
    isHost: p.hostId === userId,
    mediaItem: p.mediaItem as WatchPartyCalendarItem["mediaItem"],
    host: p.host,
  }));
}

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcs(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}
