import { auth } from "@/lib/auth";
import {
  getPerson,
  getPersonDirectedCredits,
  type PersonDirectedCredit,
  tmdbImage,
} from "@/lib/tmdb";
import { getPersonFilmography } from "@/lib/person-filmography-queries";
import { notFound } from "next/navigation";
import { PersonAvatar } from "@/components/person-avatar";
import { PersonBiography } from "@/components/person-biography";
import { MediaCard } from "@/components/media-card";
import { TitlePageTopNav } from "@/components/title-page-top-nav";
import type { Metadata } from "next";

type Params = {
  params: Promise<{ tmdbId: string }>;
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { tmdbId } = await params;
  const person = await getPerson(parseInt(tmdbId)).catch(() => null);
  return { title: person?.name ?? "Person" };
}

export default async function PersonPage({ params }: Params) {
  const { tmdbId: tmdbIdStr } = await params;
  const tmdbId = parseInt(tmdbIdStr);

  if (isNaN(tmdbId)) notFound();

  const session = await auth();
  if (!session?.user) notFound();

  const person = await getPerson(tmdbId).catch(() => null);
  if (!person) notFound();

  const [filmography, directedCredits] = await Promise.all([
    getPersonFilmography(person.name, session.user.id),
    getPersonDirectedCredits(tmdbId).catch((): PersonDirectedCredit[] => []),
  ]);

  const directedMovies = directedCredits.filter((c) => c.mediaType === "movie");
  const directedTv = directedCredits.filter((c) => c.mediaType === "tv");

  const profileUrl = person.profilePath
    ? tmdbImage(person.profilePath, "w185")
    : null;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <TitlePageTopNav />

        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <PersonAvatar name={person.name} photoUrl={profileUrl} size="lg" />

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{person.name}</h1>
            {person.knownForDepartment && (
              <p className="text-muted-foreground mb-4">
                {person.knownForDepartment}
              </p>
            )}
            {person.biography ? (
              <PersonBiography text={person.biography} />
            ) : null}
          </div>
        </div>

        {filmography.totalCount === 0 ? (
          <div className="rounded-lg border border-border bg-card/50 px-4 py-8 text-center">
            <p className="text-muted-foreground">
              No titles featuring {person.name} found in your libraries or
              synced catalog.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              Titles below are titles Screened already knows about (usually from
              Plex or Jellyfin sync) where this person appears in the stored
              cast list or matches the stored director name.
            </p>
            {filmography.movies.length > 0 && (
              <section className="mb-12">
                <h3 className="text-base font-semibold mb-4">
                  Movies in your library{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {filmography.movies.length}
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
                  {filmography.movies.map((item) => (
                    <MediaCard
                      key={`lib-movie-${item.tmdbId}`}
                      tmdbId={item.tmdbId}
                      type="movie"
                      title={item.title}
                      poster={item.poster}
                      year={
                        item.releaseDate
                          ? new Date(item.releaseDate).getFullYear()
                          : null
                      }
                      compact
                      status={item.watchStatus}
                      rating={item.userRating}
                    />
                  ))}
                </div>
              </section>
            )}

            {filmography.tvShows.length > 0 && (
              <section className="mb-12">
                <h3 className="text-base font-semibold mb-4">
                  TV in your library{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {filmography.tvShows.length}
                  </span>
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
                  {filmography.tvShows.map((item) => (
                    <MediaCard
                      key={`lib-tv-${item.tmdbId}`}
                      tmdbId={item.tmdbId}
                      type="tv"
                      title={item.title}
                      poster={item.poster}
                      year={
                        item.releaseDate
                          ? new Date(item.releaseDate).getFullYear()
                          : null
                      }
                      compact
                      status={item.watchStatus}
                      rating={item.userRating}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {directedCredits.length > 0 && (
          <section className="mt-12 border-t border-border pt-10">
            <h3 className="text-base font-semibold mb-1">
              All directing credits{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {directedCredits.length}
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              Full list from TMDB (Director, Co-Director, Series Director,
              Creator). Open a title to add it to your watchlist or log a
              watch—even if it is not in your Plex/Jellyfin library yet.
            </p>

            {directedMovies.length > 0 && (
              <div className="mb-10">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Movies
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
                  {directedMovies.map((c) => (
                    <MediaCard
                      key={`tmdb-dir-movie-${c.tmdbId}`}
                      tmdbId={c.tmdbId}
                      type="movie"
                      title={c.title}
                      poster={c.poster}
                      year={
                        c.releaseDate
                          ? new Date(c.releaseDate).getFullYear()
                          : null
                      }
                      compact
                    />
                  ))}
                </div>
              </div>
            )}

            {directedTv.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  TV
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
                  {directedTv.map((c) => (
                    <MediaCard
                      key={`tmdb-dir-tv-${c.tmdbId}`}
                      tmdbId={c.tmdbId}
                      type="tv"
                      title={c.title}
                      poster={c.poster}
                      year={
                        c.releaseDate
                          ? new Date(c.releaseDate).getFullYear()
                          : null
                      }
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
