import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWatchParty } from "@/lib/watch-party";
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

  const party = await getWatchParty(id, userId);
  if (!party) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <WatchPartyDetail party={party} currentUserId={userId} />
    </div>
  );
}
