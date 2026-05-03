import { prisma } from "@/lib/prisma";
import {
  getJellyfinHistory,
  extractTmdbIdFromJellyfinItem,
} from "@/lib/jellyfin";
import { getMovie, getTvShow } from "@/lib/tmdb";
import {
  findMergeCandidateWatchEntry,
  mergeJellyfinIntoWatchEntry,
} from "@/lib/watch-entry-merge";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

export interface JellyfinSyncResult {
  synced: number;
  skipped: number;
  tvShows: number;
  episodes: number;
  episodesSkipped: number;
}

export async function syncJellyfinUser(
  userId: string,
): Promise<JellyfinSyncResult> {
  const connection = await prisma.jellyfinConnection.findUnique({
    where: { userId },
  });

  if (!connection) throw new Error("Jellyfin not connected");

  const { serverUrl, apiKey, jellyfinUserId } = connection;

  // --- Movie sync ---
  const movies = await getJellyfinHistory(
    serverUrl,
    apiKey,
    jellyfinUserId,
    "Movie",
  );

  let synced = 0;
  let skipped = 0;

  for (const item of movies) {
    const tmdbId = extractTmdbIdFromJellyfinItem(item);
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

    const rawDate = item.UserData?.LastPlayedDate;
    const watchedAt = rawDate ? new Date(rawDate) : new Date();

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
          source: WatchEntrySource.JELLYFIN,
        },
      });
    } else {
      await mergeJellyfinIntoWatchEntry(existingEntry);
    }

    synced++;
  }

  // --- TV episode sync ---
  const episodes = await getJellyfinHistory(
    serverUrl,
    apiKey,
    jellyfinUserId,
    "Episode",
  );

  let tvShows = 0;
  let episodeCount = 0;
  let episodesSkipped = 0;

  if (episodes.length > 0) {
    const showMap = new Map<number, typeof episodes>();

    for (const ep of episodes) {
      const showTmdbId = extractTmdbIdFromJellyfinItem(ep, true);
      if (!showTmdbId) {
        episodesSkipped++;
        continue;
      }
      if (!showMap.has(showTmdbId)) showMap.set(showTmdbId, []);
      showMap.get(showTmdbId)!.push(ep);
    }

    for (const [showTmdbId, showEpisodes] of showMap) {
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
        const seasonNumber = ep.ParentIndexNumber;
        const episodeNumber = ep.IndexNumber;
        if (
          typeof seasonNumber !== "number" ||
          typeof episodeNumber !== "number" ||
          seasonNumber < 0 ||
          episodeNumber < 1
        ) {
          episodesSkipped++;
          continue;
        }

        const rawDate = ep.UserData?.LastPlayedDate;
        const watchedAt = rawDate ? new Date(rawDate) : new Date();

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
      episodeCount += validCount;
    }
  }

  await prisma.jellyfinConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });

  return { synced, skipped, tvShows, episodes: episodeCount, episodesSkipped };
}
