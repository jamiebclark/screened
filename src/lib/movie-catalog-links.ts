/** Outbound links built from TMDB ids (and IMDb when TMDB provides it). */
export type TitleCatalogLinks = {
  tmdbUrl: string;
  /** Letterboxd film page — movies only; omit for TV. */
  letterboxdFilmUrl?: string;
  imdbUrl: string | null;
};

export function imdbTitleUrl(imdbId: string | null | undefined): string | null {
  if (!imdbId || typeof imdbId !== "string") return null;
  const id = imdbId.trim();
  if (!id.startsWith("tt")) return null;
  return `https://www.imdb.com/title/${id}/`;
}

export function buildMovieCatalogLinks(
  tmdbId: number,
  imdbId: string | null | undefined,
): TitleCatalogLinks {
  return {
    tmdbUrl: `https://www.themoviedb.org/movie/${tmdbId}`,
    letterboxdFilmUrl: `https://letterboxd.com/tmdb/${tmdbId}/`,
    imdbUrl: imdbTitleUrl(imdbId),
  };
}

export function buildTvCatalogLinks(
  tmdbId: number,
  imdbId: string | null | undefined,
): TitleCatalogLinks {
  return {
    tmdbUrl: `https://www.themoviedb.org/tv/${tmdbId}`,
    imdbUrl: imdbTitleUrl(imdbId),
  };
}
