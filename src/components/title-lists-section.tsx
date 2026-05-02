import { prisma } from "@/lib/prisma";
import { MediaType } from "@/generated/prisma";
import { ListCard } from "./list-card";
import { PublicListsGrid } from "./public-lists-grid";

type Props = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  userId: string | null;
};

export async function TitleListsSection({ tmdbId, mediaType, userId }: Props) {
  const type = mediaType === "movie" ? MediaType.MOVIE : MediaType.TV;
  const include = {
    items: {
      take: 4,
      include: { mediaItem: { select: { poster: true, title: true } } },
      orderBy: { addedAt: "desc" as const },
    },
    _count: { select: { items: true, members: true } },
  };
  const containsTitle = {
    items: { some: { mediaItem: { tmdbId, type } } },
  };

  const [myLists, publicLists] = await Promise.all([
    userId
      ? prisma.list.findMany({
          where: {
            AND: [
              { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
              containsTitle,
            ],
          },
          include,
          orderBy: { updatedAt: "desc" },
        })
      : [],
    prisma.list.findMany({
      where: {
        isPublic: true,
        ...(userId
          ? {
              NOT: {
                OR: [{ ownerId: userId }, { members: { some: { userId } } }],
              },
            }
          : {}),
        ...containsTitle,
      },
      include,
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  if (myLists.length === 0 && publicLists.length === 0) return null;

  return (
    <section className="mt-12 space-y-6">
      <h2 className="text-lg font-semibold">On lists</h2>

      {myLists.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">
            Your lists{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {myLists.length}
            </span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {myLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </div>
      )}

      {publicLists.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold">
            Public lists{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {publicLists.length}
            </span>
          </h3>
          <PublicListsGrid lists={publicLists} />
        </div>
      )}
    </section>
  );
}
