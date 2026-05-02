import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PickSession } from "./pick-session";
import {
  defaultPickerState,
  isPickerState,
  withScoringDefaults,
  type PickerRoomState,
} from "@/lib/picker-room-state";
import { hydratePickerFingerprintIfNeeded } from "@/lib/picker-score-fingerprint";
import { redirect } from "next/navigation";

export const metadata = { title: "Movie Night Picker | Screened" };

type PageProps = { searchParams: Promise<{ room?: string }> };

export default async function PickPage({ searchParams }: PageProps) {
  const { room: roomParam } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [currentUser, savedPreferences, roomRow, plexConnection, presets] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatarUrl: true },
      }),
      prisma.userPreference.findMany({
        where: { userId },
        include: {
          mediaItem: {
            select: {
              id: true,
              tmdbId: true,
              title: true,
              poster: true,
              year: true,
              embedding: true,
              genres: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      roomParam
        ? prisma.pickerRoom.findUnique({ where: { id: roomParam } })
        : null,
      prisma.plexConnection.findUnique({
        where: { userId },
        select: { id: true },
      }),
      prisma.pickerRoomPreset.findMany({
        where: { createdById: userId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  if (roomParam && !roomRow) {
    redirect("/pick");
  }

  const initialAttractors = savedPreferences
    .filter((p) => p.type === "ATTRACTOR")
    .map((p) => ({
      mediaItemId: p.mediaItem.id,
      tmdbId: p.mediaItem.tmdbId,
      title: p.mediaItem.title,
      poster: p.mediaItem.poster,
      year: p.mediaItem.year,
      weight: p.weight,
      saved: true,
      hasEmbedding: p.mediaItem.embedding.length > 0,
      genres: p.mediaItem.genres,
    }));

  const initialRepellers = savedPreferences
    .filter((p) => p.type === "REPELLER")
    .map((p) => ({
      mediaItemId: p.mediaItem.id,
      tmdbId: p.mediaItem.tmdbId,
      title: p.mediaItem.title,
      poster: p.mediaItem.poster,
      year: p.mediaItem.year,
      weight: p.weight,
      saved: true,
      hasEmbedding: p.mediaItem.embedding.length > 0,
      genres: p.mediaItem.genres,
    }));

  let initialRoomState: PickerRoomState | null = null;
  if (roomRow && isPickerState(roomRow.state)) {
    const st = withScoringDefaults(roomRow.state);
    if (!st.participants.some((p) => p.id === currentUser!.id)) {
      initialRoomState = hydratePickerFingerprintIfNeeded(
        withScoringDefaults({
          ...st,
          participants: [currentUser!, ...st.participants],
        }),
      );
    } else {
      initialRoomState = hydratePickerFingerprintIfNeeded(st);
    }
  } else {
    const base = defaultPickerState(currentUser!);
    initialRoomState = {
      ...base,
      attractors: initialAttractors,
      repellers: initialRepellers,
    };
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Movie Night Picker</h1>
        <p className="text-muted-foreground mt-1">
          Tell us what you&apos;re in the mood for and we&apos;ll find the best
          match from your library.
        </p>
      </div>
      <PickSession
        currentUser={currentUser!}
        roomId={roomParam ?? null}
        initialRoomState={initialRoomState}
        hasPlexLinked={!!plexConnection}
        presets={presets}
      />
    </div>
  );
}
