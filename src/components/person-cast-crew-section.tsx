"use client";

import Link from "next/link";
import { PersonAvatar } from "./person-avatar";
import { tmdbImage } from "@/lib/tmdb";
import { useEffect, useState } from "react";

interface PersonCastCrewSectionProps {
  cast: string[];
  director: string | null;
}

interface PersonWithId {
  name: string;
  tmdbId: number | null;
  profilePath: string | null;
}

export function PersonCastCrewSection({
  cast,
  director,
}: PersonCastCrewSectionProps) {
  const [castWithIds, setCastWithIds] = useState<PersonWithId[]>([]);
  const [directorWithId, setDirectorWithId] = useState<PersonWithId | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolvePersonIds() {
      setLoading(true);
      try {
        const peopleToResolve = [...(director ? [director] : []), ...cast];

        const resolved = await Promise.all(
          peopleToResolve.map(async (name) => {
            try {
              const res = await fetch(
                `/api/person/resolve?name=${encodeURIComponent(name)}`,
              );
              if (!res.ok) {
                return { name, tmdbId: null, profilePath: null };
              }
              const data = await res.json();
              return {
                name,
                tmdbId: data.tmdbId,
                profilePath: data.profilePath,
              };
            } catch {
              return { name, tmdbId: null, profilePath: null };
            }
          }),
        );

        if (director) {
          setDirectorWithId(resolved[0]);
          setCastWithIds(resolved.slice(1));
        } else {
          setCastWithIds(resolved);
        }
      } catch (error) {
        console.error("Error resolving person IDs:", error);
      } finally {
        setLoading(false);
      }
    }

    resolvePersonIds();
  }, [cast, director]);

  if (loading) {
    return (
      <section className="mt-8">
        <h3 className="text-base font-semibold mb-4">Cast & Crew</h3>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h3 className="text-base font-semibold mb-4">Cast & Crew</h3>

      {directorWithId && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Director
          </h4>
          <PersonCard person={directorWithId} />
        </div>
      )}

      {castWithIds.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Cast
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {castWithIds.map((person) => (
              <PersonCard key={person.name} person={person} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PersonCard({ person }: { person: PersonWithId }) {
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
