import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ListVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/list-card";

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
