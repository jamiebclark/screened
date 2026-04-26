import { getMovieSiteContext } from "@/lib/movie-site-context";
import { MovieScreenedContextBody } from "@/components/movie-site-context-panel";

/** Deferred server fetch: Plex + list membership dominates movie page TTFB. */
export async function MovieScreenedContextAsync({
  userId,
  tmdbId,
}: {
  userId: string;
  tmdbId: number;
}) {
  const context = await getMovieSiteContext(userId, tmdbId);
  return <MovieScreenedContextBody context={context} />;
}
