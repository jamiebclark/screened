import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, ListVideo, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/list-card";
import { getRepoDocumentationLinks } from "@/lib/app-release";

export const metadata: Metadata = { title: "Lists" };

export default async function ListsPage() {
  const session = await auth();

  const [{ listsUrl }, [myLists, publicLists]] = await Promise.all([
    getRepoDocumentationLinks(),
    Promise.all([
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
    ]),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 space-y-16">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-4xl font-bold">Lists</h1>
          <p className="text-base text-muted-foreground">
            Curate and share watchlists with friends. Connect a list to Radarr
            to auto-download new additions.{" "}
            {listsUrl && (
              <a
                href={listsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-2 whitespace-nowrap"
              >
                Learn more
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </a>
            )}
          </p>
        </div>
        <Button asChild className="shrink-0 gap-1.5">
          <Link href="/lists/new">
            <Plus className="h-4 w-4" />
            New list
          </Link>
        </Button>
      </div>

      <section>
        <h3 className="text-xl font-semibold mb-5">My lists</h3>
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
          <h3 className="text-xl font-semibold mb-5">Discover</h3>
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
