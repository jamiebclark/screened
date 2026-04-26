import { prisma } from "@/lib/prisma";
import {
  getPlexServers,
  getPlexWatchHistory,
  getPlexWatchedEpisodes,
  getPlexItemMetadata,
  extractTmdbIdFromGuid,
} from "@/lib/plex";
import { getMovie, getTvShow } from "@/lib/tmdb";
import {
  findMergeCandidateWatchEntry,
  mergePlexIntoWatchEntryIfUnknown,
} from "@/lib/watch-entry-merge";
import { MediaType, WatchEntrySource, WatchStatus } from "@/generated/prisma";

export interface PlexSyncResult {
  synced: number;
  skipped: number;
  tvShows: number;
  episodes: number;
  episodesSkipped: number;
}

export async function syncPlexUser(userId: string): Promise<PlexSyncResult> {
  const connection = await prisma.plexConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    throw new Error("Plex not connected");
  }

  const servers = await getPlexServers(connection.plexToken);
  const server =
    servers.find((s) => s.machineIdentifier === connection.plexServerId) ??
    servers[0];

  if (!server) {
    throw new Error("No Plex server found");
  }

  const serverUrl = server.uri;
  const serverToken = server.accessToken ?? connection.plexToken;

  // --- Movie sync ---
  const watchedMovies = await getPlexWatchHistory(serverUrl, serverToken, "movie");

  let synced = 0;
  let skipped = 0;

  for (const item of watchedMovies) {
    const tmdbId = extractTmdbIdFromGuid(item.Guid);
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
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            overview: movie.overview,
            genres: movie.genres.map((g) => g.name),
            runtime: movie.runtime,
          },
        });
      } catch {
        skipped++;
        continue;
      }
    }

    const watchedAt = item.lastViewedAt ? new Date(item.lastViewedAt * 1000) : new Date();

    const upserted = await prisma.userMediaStatus.upsert({
      where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
      update: { status: WatchStatus.WATCHED },
      create: { userId, mediaItemId: mediaItem.id, status: WatchStatus.WATCHED },
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
          source: WatchEntrySource.PLEX,
        },
      });
    } else {
      await mergePlexIntoWatchEntryIfUnknown(existingEntry);
    }

    synced++;
  }

  // --- TV episode sync ---
  const watchedEpisodes = await getPlexWatchedEpisodes(serverUrl, serverToken);

  let tvShows = 0;
  let episodes = 0;
  let episodesSkipped = 0;

  if (watchedEpisodes.length > 0) {
    const uniqueShowKeys = [
      ...new Set(watchedEpisodes.map((e) => e.grandparentRatingKey)),
    ];
    const showTmdbIdMap = new Map<string, number>();

    for (const ratingKey of uniqueShowKeys) {
      const showMeta = await getPlexItemMetadata(serverUrl, serverToken, ratingKey);
      if (showMeta) {
        const tmdbId = extractTmdbIdFromGuid(showMeta.Guid);
        if (tmdbId) showTmdbIdMap.set(ratingKey, tmdbId);
      }
    }

    const episodesByShow = new Map<string, typeof watchedEpisodes>();
    for (const ep of watchedEpisodes) {
      if (!episodesByShow.has(ep.grandparentRatingKey)) {
        episodesByShow.set(ep.grandparentRatingKey, []);
      }
      episodesByShow.get(ep.grandparentRatingKey)!.push(ep);
    }

    for (const [showRatingKey, showEpisodes] of episodesByShow) {
      const tmdbId = showTmdbIdMap.get(showRatingKey);
      if (!tmdbId) {
        episodesSkipped += showEpisodes.length;
        continue;
      }

      let mediaItem = await prisma.mediaItem.findUnique({
        where: { tmdbId_type: { tmdbId, type: MediaType.TV } },
      });

      if (!mediaItem) {
        try {
          const show = await getTvShow(tmdbId);
          mediaItem = await prisma.mediaItem.create({
            data: {
              tmdbId,
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
            },
          });
        } catch {
          episodesSkipped += showEpisodes.length;
          continue;
        }
      }

      const validEpisodes = showEpisodes.filter(
        (ep) => ep.parentIndex != null && ep.index != null
      );

      await prisma.episodeStatus.createMany({
        data: validEpisodes.map((ep) => ({
          userId,
          mediaItemId: mediaItem!.id,
          seasonNumber: ep.parentIndex,
          episodeNumber: ep.index,
          watchedAt: ep.lastViewedAt ? new Date(ep.lastViewedAt * 1000) : new Date(),
        })),
        skipDuplicates: true,
      });

      const existingStatus = await prisma.userMediaStatus.findUnique({
        where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
      });

      if (!existingStatus) {
        await prisma.userMediaStatus.create({
          data: { userId, mediaItemId: mediaItem.id, status: WatchStatus.WATCHING },
        });
      } else if (existingStatus.status === WatchStatus.WATCHLIST) {
        await prisma.userMediaStatus.update({
          where: { userId_mediaItemId: { userId, mediaItemId: mediaItem.id } },
          data: { status: WatchStatus.WATCHING },
        });
      }

      tvShows++;
      episodes += validEpisodes.length;
      episodesSkipped += showEpisodes.length - validEpisodes.length;
    }
  }

  await prisma.plexConnection.update({
    where: { userId },
    data: { lastSyncedAt: new Date() },
  });

  return { synced, skipped, tvShows, episodes, episodesSkipped };
}
