import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlexServers, getPlexWatchHistory, extractTmdbIdFromGuid } from "@/lib/plex";
import { getMovie } from "@/lib/tmdb";
import { MediaType, WatchStatus } from "@/generated/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await prisma.plexConnection.findUnique({
    where: { userId: session.user.id },
  });

  if (!connection) {
    return NextResponse.json({ error: "Plex not connected" }, { status: 400 });
  }

  try {
    const servers = await getPlexServers(connection.plexToken);
    const server = servers.find((s) => s.machineIdentifier === connection.plexServerId) ?? servers[0];

    if (!server) {
      return NextResponse.json({ error: "No Plex server found" }, { status: 400 });
    }

    const serverUrl = `${server.scheme}://${server.address}:${server.port}`;
    const serverToken = server.accessToken ?? connection.plexToken;

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

      await prisma.userMediaStatus.upsert({
        where: { userId_mediaItemId: { userId: session.user.id, mediaItemId: mediaItem.id } },
        update: { status: WatchStatus.WATCHED, watchedAt: item.lastViewedAt ? new Date(item.lastViewedAt * 1000) : new Date() },
        create: {
          userId: session.user.id,
          mediaItemId: mediaItem.id,
          status: WatchStatus.WATCHED,
          watchedAt: item.lastViewedAt ? new Date(item.lastViewedAt * 1000) : new Date(),
        },
      });

      synced++;
    }

    await prisma.plexConnection.update({
      where: { userId: session.user.id },
      data: { lastSyncedAt: new Date() },
    });

    return NextResponse.json({ synced, skipped });
  } catch (err) {
    console.error("Plex sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
