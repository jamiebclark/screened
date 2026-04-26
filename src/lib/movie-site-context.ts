import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import { findPlexMovieByTmdbIdForUser } from "@/lib/plex";
import { plexWebAppMovieUrl } from "@/lib/plex-metadata-utils";

export type { TitleCatalogLinks } from "@/lib/movie-catalog-links";
export { buildMovieCatalogLinks, buildTvCatalogLinks, imdbTitleUrl } from "@/lib/movie-catalog-links";

export type MovieSiteContext = {
  /** Signed-in user (for “your” Plex card). */
  viewer: { name: string; avatarUrl: string | null };
  lists: { slug: string; name: string }[];
  myPlex:
    | { state: "not_linked" }
    | { state: "not_in_library" }
    | { state: "in_library"; openUrl: string };
  friendsInPlex: { userId: string; name: string; avatarUrl: string | null; openUrl: string }[];
};

async function listSummariesForViewerMovie(userId: string, tmdbId: number) {
  const rows = await prisma.listItem.findMany({
    where: {
      mediaItem: { tmdbId, type: MediaType.MOVIE },
      list: { members: { some: { userId } } },
    },
    select: { list: { select: { slug: true, name: true } } },
    orderBy: { addedAt: "desc" },
  });
  return rows.map((r) => r.list);
}

async function friendSummariesWithPlex(viewerId: string) {
  const [asLow, asHigh] = await Promise.all([
    prisma.friendship.findMany({
      where: { userLowId: viewerId },
      select: {
        userHigh: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            plexConnection: { select: { id: true } },
          },
        },
      },
    }),
    prisma.friendship.findMany({
      where: { userHighId: viewerId },
      select: {
        userLow: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            plexConnection: { select: { id: true } },
          },
        },
      },
    }),
  ]);
  const merged = [
    ...asLow.map((r) => r.userHigh),
    ...asHigh.map((r) => r.userLow),
  ];
  return merged
    .filter((u) => u.plexConnection != null)
    .map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }));
}

/** Lists you’re on, your Plex library, and friends’ Plex libraries (for one movie). */
export async function getMovieSiteContext(userId: string, tmdbId: number): Promise<MovieSiteContext> {
  const [lists, friends, viewer] = await Promise.all([
    listSummariesForViewerMovie(userId, tmdbId),
    friendSummariesWithPlex(userId),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, avatarUrl: true },
    }),
  ]);

  const linked = await prisma.plexConnection.findUnique({
    where: { userId },
    select: { id: true },
  });
  let myPlex: MovieSiteContext["myPlex"];
  if (!linked) {
    myPlex = { state: "not_linked" };
  } else {
    const myHit = await findPlexMovieByTmdbIdForUser(userId, tmdbId).catch(() => null);
    myPlex = myHit
      ? { state: "in_library", openUrl: plexWebAppMovieUrl(myHit.machineIdentifier, myHit.ratingKey) }
      : { state: "not_in_library" };
  }

  const friendsInPlex: MovieSiteContext["friendsInPlex"] = [];
  await Promise.all(
    friends.map(async (f) => {
      const hit = await findPlexMovieByTmdbIdForUser(f.id, tmdbId).catch(() => null);
      if (hit) {
        friendsInPlex.push({
          userId: f.id,
          name: f.name,
          avatarUrl: f.avatarUrl,
          openUrl: plexWebAppMovieUrl(hit.machineIdentifier, hit.ratingKey),
        });
      }
    })
  );
  friendsInPlex.sort((a, b) => a.name.localeCompare(b.name));

  return { viewer, lists, myPlex, friendsInPlex };
}
