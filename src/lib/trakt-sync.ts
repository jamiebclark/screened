import { prisma } from "@/lib/prisma";
import {
  getTraktMovieHistory,
  getTraktEpisodeHistory,
  refreshTraktToken,
} from "@/lib/trakt";
import { getMovie, getTvShow } from "@/lib/tmdb";
import {
  findMergeCandidateWatchEntry,
  mergeTraktIntoWatchEntry,
} from "@/lib/watch-entry-merge";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

export interface TraktSyncResult {
  synced: number;
  skipped: number;
  tvShows: number;
  episodes: number;
  episodesSkipped: number;
}

export async function syncTraktUser(userId: string): Promise<TraktSyncResult> {
  const connection = await prisma.traktConnection.findUnique({
    where: { userId },
  });

  if (!connection) throw new Error("Trakt not connected");

  let { accessToken } = connection;

  // Refresh token if within 7 days of expiry
  if (connection.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000) {
    const refreshed = await refreshTraktToken(connection.refreshToken);
    if (refreshed) {
      accessToken = refreshed.access_token;
      await prisma.traktConnection.update({
        where: { userId },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    }
  }

  // --- Movie sync ---
  const movieHistory = await getTraktMovieHistory(accessToken);

  let synced = 0;
  let skipped = 0;

  for (const record of movieHistory) {
    const tmdbId = record.movie.ids.tmdb;
    if (!tmdbId) {
      skipped++;
      continue;
    }

    let mediaItem = await prisma.mediaItem.findUnique({
      where: { tmdbId_type: { tmdbId, type: MediaType.MOVIE } },
    });

    if (!mediaItem) {
      try {
        const movie = await getMovie(tmdbId);
        mediaItem = await prisma.mediaItem.create({
          data: {
            tmdbId,
            type: MediaType.MOVIE,
            title: movie.title,
            poster: movie.poster_path,
            backdrop: movie.backdrop_path,
            year: movie.release_date
              ? new Date(movie.release_date).getFullYear()
              : null,
            overview: movie.overview,
            genres: movie.genres.map((g) => g.name),
            runtime: movie.runtime,
            releaseDate: movie.release_date
              ? new Date(movie.release_date)
              : null,
          },
        });
      } catch {
        skipped++;
        continue;
      }
    }

    const watchedAt = new Date(record.watched_at);

    const upserted = await prisma.userMediaStatus.upsert({
      where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
      update: { status: WatchStatus.WATCHED },
      create: {
        userId,
        mediaItemId: mediaItem.id,
        status: WatchStatus.WATCHED,
      },
    });

    const existingEntry = await findMergeCandidateWatchEntry(
      userId,
      mediaItem.id,
      watchedAt,
    );
    if (!existingEntry) {
      await prisma.watchEntry.create({
        data: {
          userId,
          mediaItemId: mediaItem.id,
          userMediaStatusId: upserted.id,
          watchedAt,
          source: WatchEntrySource.TRAKT,
        },
      });
    } else {
      await mergeTraktIntoWatchEntry(existingEntry);
    }

    synced++;
  }

  // --- TV episode sync ---
  const episodeHistory = await getTraktEpisodeHistory(accessToken);

  let tvShows = 0;
  let episodes = 0;
  let episodesSkipped = 0;

  if (episodeHistory.length > 0) {
    const showMap = new Map<number, { records: typeof episodeHistory }>();

    for (const ep of episodeHistory) {
      const showTmdbId = ep.show.ids.tmdb;
      if (!showTmdbId) {
        episodesSkipped++;
        continue;
      }
      if (!showMap.has(showTmdbId)) showMap.set(showTmdbId, { records: [] });
      showMap.get(showTmdbId)!.records.push(ep);
    }

    for (const [showTmdbId, { records: showEpisodes }] of showMap) {
      let mediaItem = await prisma.mediaItem.findUnique({
        where: { tmdbId_type: { tmdbId: showTmdbId, type: MediaType.TV } },
      });

      if (!mediaItem) {
        try {
          const show = await getTvShow(showTmdbId);
          mediaItem = await prisma.mediaItem.create({
            data: {
              tmdbId: showTmdbId,
              type: MediaType.TV,
              title: show.name,
              poster: show.poster_path,
              backdrop: show.backdrop_path,
              year: show.first_air_date
                ? new Date(show.first_air_date).getFullYear()
                : null,
              overview: show.overview,
              genres: show.genres.map((g) => g.name),
              runtime: show.episode_run_time[0] ?? null,
              releaseDate: show.first_air_date
                ? new Date(show.first_air_date)
                : null,
            },
          });
        } catch {
          episodesSkipped += showEpisodes.length;
          continue;
        }
      }

      let validCount = 0;
      for (const ep of showEpisodes) {
        const seasonNumber = ep.episode.season;
        const episodeNumber = ep.episode.number;
        if (seasonNumber < 0 || episodeNumber < 1) {
          episodesSkipped++;
          continue;
        }

        const watchedAt = new Date(ep.watched_at);

        await prisma.episodeStatus.upsert({
          where: {
            userId_mediaItemId_seasonNumber_episodeNumber: {
              userId,
              mediaItemId: mediaItem!.id,
              seasonNumber,
              episodeNumber,
            },
          },
          create: {
            userId,
            mediaItemId: mediaItem!.id,
            seasonNumber,
            episodeNumber,
            watchedAt,
            isWatched: true,
          },
          update: { watchedAt, isWatched: true },
        });

        validCount++;
      }

      if (validCount === 0) continue;

      const existingStatus = await prisma.userMediaStatus.findUnique({
        where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
      });

      if (!existingStatus) {
        await prisma.userMediaStatus.create({
          data: {
            userId,
            mediaItemId: mediaItem.id,
            status: WatchStatus.WATCHING,
          },
        });
      } else if (existingStatus.status === WatchStatus.WATCHLIST) {
        await prisma.userMediaStatus.update({
          where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
          data: { status: WatchStatus.WATCHING },
        });
      }

      tvShows++;
      episodes += validCount;
    }
  }

  await prisma.traktConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });

  return { synced, skipped, tvShows, episodes, episodesSkipped };
}
