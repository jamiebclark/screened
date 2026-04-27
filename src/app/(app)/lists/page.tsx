import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Plus, ListVideo, Lock, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tmdbImageUrl } from "@/lib/utils";

export default async function ListsPage() {
  const session = await auth();

  const [myLists, publicLists] = await Promise.all([
    prisma.list.findMany({
      where: {
        OR: [
          { ownerId: session!.user.id },
          { members: { some: { userId: session!.user.id } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true } },
        items: {
          take: 4,
          include: { mediaItem: { select: { poster: true, title: true } } },
          orderBy: { addedAt: "desc" },
        },
        _count: { select: { items: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.list.findMany({
      where: {
        isPublic: true,
        NOT: {
          OR: [
            { ownerId: session!.user.id },
            { members: { some: { userId: session!.user.id } } },
          ],
        },
      },
      include: {
        owner: { select: { id: true, name: true } },
        items: {
          take: 4,
          include: { mediaItem: { select: { poster: true, title: true } } },
          orderBy: { addedAt: "desc" },
        },
        _count: { select: { items: true, members: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const ListCard = ({ list }: { list: (typeof myLists)[number] }) => (
    <Link
      href={`/lists/${list.slug}`}
      className="block rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-200 overflow-hidden group"
    >
      <div className="h-24 bg-muted flex overflow-hidden">
        {list.items.slice(0, 4).map((item, i) => {
          const url = tmdbImageUrl(item.mediaItem.poster, "w185");
          return (
            <div key={i} className="flex-1 relative overflow-hidden">
              {url ? (
                <Image
                  src={url}
                  alt={item.mediaItem.title}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full bg-muted-foreground/20" />
              )}
            </div>
          );
        })}
        {list.items.length === 0 && (
          <div className="w-full flex items-center justify-center">
            <ListVideo className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {list.name}
          </h3>
          {list.isPublic ? (
            <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </div>
        {list.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {list.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {list._count.items} items
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {list._count.members}
          </span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lists</h1>
        <Button asChild>
          <Link href="/lists/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New list
          </Link>
        </Button>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          My lists
        </h2>
        {myLists.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <ListVideo className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">No lists yet</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/lists/new">Create your first list</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {myLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </section>

      {publicLists.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Discover
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {publicLists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
