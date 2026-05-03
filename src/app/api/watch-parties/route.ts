import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import { createWatchParty, listWatchPartiesForUser } from "@/lib/watch-party";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await listWatchPartiesForUser(session.user.id);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).tmdbId !== "number" ||
    typeof (body as Record<string, unknown>).mediaType !== "string" ||
    typeof (body as Record<string, unknown>).scheduledFor !== "string" ||
    !Array.isArray((body as Record<string, unknown>).inviteeIds)
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const {
    tmdbId,
    mediaType,
    scheduledFor: scheduledForStr,
    inviteeIds,
    pickerSessionId,
  } = body as {
    tmdbId: number;
    mediaType: "MOVIE" | "TV";
    scheduledFor: string;
    inviteeIds: string[];
    pickerSessionId?: string;
  };

  if (mediaType !== "MOVIE" && mediaType !== "TV") {
    return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 });
  }

  const scheduledFor = new Date(scheduledForStr);
  if (isNaN(scheduledFor.getTime())) {
    return NextResponse.json(
      { error: "Invalid scheduledFor date" },
      { status: 400 },
    );
  }

  if (scheduledFor < new Date()) {
    return NextResponse.json(
      { error: "scheduledFor must be in the future" },
      { status: 400 },
    );
  }

  if (
    !Array.isArray(inviteeIds) ||
    inviteeIds.length === 0 ||
    inviteeIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "inviteeIds must be a non-empty array of strings" },
      { status: 400 },
    );
  }

  try {
    const mediaItem = await prisma.mediaItem.findUnique({
      where: {
        tmdbId_type: {
          tmdbId,
          type: mediaType === "MOVIE" ? MediaType.MOVIE : MediaType.TV,
        },
      },
    });

    if (!mediaItem) {
      return NextResponse.json(
        { error: "Title not found — open the title page first" },
        { status: 404 },
      );
    }

    const party = await createWatchParty(
      session.user.id,
      mediaItem.id,
      scheduledFor,
      inviteeIds as string[],
      pickerSessionId as string | undefined,
    );

    return NextResponse.json(party, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (
      message === "All invitees must be friends" ||
      message === "Host cannot be an invitee" ||
      message === "At least one invitee is required"
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[watch-parties] create error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
