import Link from "next/link";
import { PersonAvatar } from "./person-avatar";
import { resolvePersonList, tmdbImage, type ResolvedPerson } from "@/lib/tmdb";

interface PersonCastCrewSectionProps {
  cast: string[];
  castTmdbIds: number[];
  directors: string[];
  directorsTmdbIds: number[];
  creatorName: string | null;
  creatorTmdbId: number | null;
}

export async function PersonCastCrewSection({
  cast,
  castTmdbIds,
  directors,
  directorsTmdbIds,
  creatorName,
  creatorTmdbId,
}: PersonCastCrewSectionProps) {
  const [resolvedCast, resolvedDirectors, resolvedCreator] = await Promise.all([
    resolvePersonList(cast, castTmdbIds),
    resolvePersonList(directors, directorsTmdbIds),
    creatorName
      ? resolvePersonList(
          [creatorName],
          creatorTmdbId ? [creatorTmdbId] : [],
        ).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const hasContent =
    resolvedCast.length > 0 ||
    resolvedDirectors.length > 0 ||
    resolvedCreator !== null;

  if (!hasContent) return null;

  return (
    <section className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Cast & Crew</h3>

      {resolvedDirectors.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            {resolvedDirectors.length === 1 ? "Director" : "Directors"}
          </h4>
          <div className="flex flex-wrap gap-2">
            {resolvedDirectors.map((person) => (
              <PersonCard key={person.name} person={person} />
            ))}
          </div>
        </div>
      )}

      {resolvedCreator && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Creator
          </h4>
          <PersonCard person={resolvedCreator} />
        </div>
      )}

      {resolvedCast.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Cast
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {resolvedCast.map((person) => (
              <PersonCard key={person.name} person={person} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PersonCard({ person }: { person: ResolvedPerson }) {
  const profileUrl = person.profilePath
    ? tmdbImage(person.profilePath, "w185")
    : null;

  if (person.tmdbId) {
    return (
      <Link
        href={`/person/${person.tmdbId}`}
        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <PersonAvatar name={person.name} photoUrl={profileUrl} size="sm" />
        <span className="text-sm font-medium truncate">{person.name}</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 p-2">
      <PersonAvatar name={person.name} photoUrl={profileUrl} size="sm" />
      <span className="text-sm font-medium truncate text-muted-foreground">
        {person.name}
      </span>
    </div>
  );
}
