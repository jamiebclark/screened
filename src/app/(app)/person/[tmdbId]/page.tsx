import { auth } from "@/lib/auth";
import { getPerson, tmdbImage } from "@/lib/tmdb";
import { getPersonFilmography } from "@/lib/person-filmography-queries";
import { notFound } from "next/navigation";
import { PersonAvatar } from "@/components/person-avatar";
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

  const filmography = await getPersonFilmography(person.name, session.user.id);

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
            {person.biography && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                {person.biography}
              </p>
            )}
          </div>
        </div>

        {filmography.totalCount === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No titles featuring {person.name} found in your libraries.
            </p>
          </div>
        ) : (
          <>
            {filmography.movies.length > 0 && (
              <section className="mb-12">
                <h2 className="text-base font-semibold mb-4">
                  Movies{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {filmography.movies.length}
                  </span>
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
                  {filmography.movies.map((item) => (
                    <MediaCard
                      key={item.tmdbId}
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
                      watchStatus={item.watchStatus}
                      userRating={item.userRating}
                    />
                  ))}
                </div>
              </section>
            )}

            {filmography.tvShows.length > 0 && (
              <section>
                <h2 className="text-base font-semibold mb-4">
                  TV Shows{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {filmography.tvShows.length}
                  </span>
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
                  {filmography.tvShows.map((item) => (
                    <MediaCard
                      key={item.tmdbId}
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
                      watchStatus={item.watchStatus}
                      userRating={item.userRating}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
