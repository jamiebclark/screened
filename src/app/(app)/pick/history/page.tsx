import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { Film, Trophy, Users, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ReferenceMovieJson, ScoredMovieJson } from "@/lib/picker-room-state";

type ParticipantSnapshot = { id: string; name: string | null; avatarUrl: string | null };

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AvatarStack({ participants }: { participants: ParticipantSnapshot[] }) {
  const shown = participants.slice(0, 4);
  const extra = participants.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p) => (
        <div
          key={p.id}
          className="h-6 w-6 rounded-full border-2 border-card overflow-hidden bg-muted shrink-0"
          title={p.name ?? "Unknown"}
        >
          {p.avatarUrl ? (
            <Image
              src={p.avatarUrl}
              alt={p.name ?? ""}
              width={24}
              height={24}
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-muted-foreground">
              {(p.name ?? "?")[0]?.toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-medium text-muted-foreground shrink-0">
          +{extra}
        </div>
      )}
    </div>
  );
}

function PosterStrip({ movies }: { movies: ScoredMovieJson[] }) {
  const shown = movies.slice(0, 3);
  return (
    <div className="flex gap-1.5">
      {shown.map((m) =>
        m.poster ? (
          <Link key={m.tmdbId} href={`/movies/${m.tmdbId}`}>
            <Image
              src={`https://image.tmdb.org/t/p/w92${m.poster}`}
              alt={m.title}
              width={40}
              height={60}
              className="rounded object-cover hover:opacity-80 transition-opacity"
            />
          </Link>
        ) : (
          <div
            key={m.tmdbId}
            className="w-10 h-15 rounded bg-muted flex items-center justify-center shrink-0"
          >
            <Film className="h-3 w-3 text-muted-foreground" />
          </div>
        ),
      )}
    </div>
  );
}

interface PickerSessionRow {
  id: string;
  participants: unknown;
  attractors: unknown;
  results: unknown;
  pickedTmdbId: number | null;
  createdAt: Date;
}

function PickerSessionCard({ session }: { session: PickerSessionRow }) {
  const participants = (session.participants as ParticipantSnapshot[]) ?? [];
  const attractors = (session.attractors as ReferenceMovieJson[]) ?? [];
  const results = (session.results as ScoredMovieJson[]) ?? [];
  const picked = results.find((m) => m.tmdbId === session.pickedTmdbId);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <PosterStrip movies={results} />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(session.createdAt)}
                </p>
                {picked && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    <Link
                      href={`/movies/${picked.tmdbId}`}
                      className="font-semibold text-sm hover:underline"
                    >
                      {picked.title}
                    </Link>
                  </div>
                )}
              </div>
              <AvatarStack participants={participants} />
            </div>

            {attractors.length > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                Based on: {attractors.map((a) => a.title).join(", ")}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"} ·{" "}
              {participants.length} participant{participants.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function PickHistoryPage() {
  const session = await auth();
  const sessions = await prisma.pickerSession.findMany({
    where: { createdById: session!.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Pick history</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/pick">New session</Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-12 text-center">
          <Clapperboard className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1 max-w-xs">
            <p className="font-medium">No saved sessions yet</p>
            <p className="text-sm text-muted-foreground">
              Run the picker and save a session to keep a record of what you
              considered and what you picked.
            </p>
          </div>
          <Button asChild>
            <Link href="/pick">
              <Users className="h-4 w-4" />
              Start picking
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <PickerSessionCard key={s.id} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
