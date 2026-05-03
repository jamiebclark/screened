import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWatchParty } from "@/lib/watch-party";
import { ensureCalendarToken } from "@/lib/ensure-calendar-token";
import { WatchPartyDetail } from "./watch-party-detail";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return {};
  const party = await getWatchParty(id, session.user.id);
  if (!party) return {};
  return {
    title: `Watch Party: ${party.mediaItem.title}`,
  };
}

export default async function WatchPartyPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [party, calendarToken] = await Promise.all([
    getWatchParty(id, userId),
    ensureCalendarToken(userId),
  ]);
  if (!party) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const feedUrl = `${appUrl}/api/calendar/feed?token=${calendarToken}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <WatchPartyDetail
        party={party}
        currentUserId={userId}
        feedUrl={feedUrl}
      />
    </div>
  );
}
