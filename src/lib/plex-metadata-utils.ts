export function extractTmdbIdFromGuid(
  guids: { id: string }[] | undefined,
): number | null {
  if (!guids) return null;
  const tmdbGuid = guids.find((g) => g.id.startsWith("tmdb://"));
  if (!tmdbGuid) return null;
  const id = parseInt(tmdbGuid.id.replace("tmdb://", ""), 10);
  return isNaN(id) ? null : id;
}

/**
 * Plex Web “desktop” URL for a library movie. Opens in the browser app when the user is signed in.
 */
export function plexWebAppMovieUrl(
  machineIdentifier: string,
  ratingKey: string,
): string {
  const key = encodeURIComponent(`/library/metadata/${ratingKey}`);
  return `https://app.plex.tv/desktop/#!/server/${machineIdentifier}/details?key=${key}`;
}
