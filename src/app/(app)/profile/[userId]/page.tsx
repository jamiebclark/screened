import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Eye, Clock, Bookmark, Star } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaType } from "@/generated/prisma";

type Params = { params: Promise<{ userId: string }> };

export default async function ProfilePage({ params }: Params) {
  const { userId } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      mediaStatuses: {
        include: { mediaItem: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === userId;

  const watched = user.mediaStatuses.filter((s) => s.status === "WATCHED");
  const watching = user.mediaStatuses.filter((s) => s.status === "WATCHING");
  const watchlist = user.mediaStatuses.filter((s) => s.status === "WATCHLIST");
  const movies = user.mediaStatuses.filter((s) => s.mediaItem.type === MediaType.MOVIE);
  const tvShows = user.mediaStatuses.filter((s) => s.mediaItem.type === MediaType.TV);
  const rated = user.mediaStatuses.filter((s) => s.rating !== null);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, s) => sum + (s.rating ?? 0), 0) / rated.length
    : null;

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <Avatar className="h-20 w-20 text-lg">
          <AvatarImage src={user.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {user.bio && <p className="text-muted-foreground mt-1">{user.bio}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Watched", value: watched.length, icon: Eye, color: "text-green-400" },
          { label: "Watching", value: watching.length, icon: Clock, color: "text-yellow-400" },
          { label: "Watchlist", value: watchlist.length, icon: Bookmark, color: "text-blue-400" },
          { label: "Avg rating", value: avgRating ? `${avgRating.toFixed(1)}★` : "—", icon: Star, color: "text-yellow-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Activity tabs */}
      <Tabs defaultValue="watched">
        <TabsList>
          <TabsTrigger value="watched">Watched ({watched.length})</TabsTrigger>
          <TabsTrigger value="watching">Watching ({watching.length})</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist ({watchlist.length})</TabsTrigger>
        </TabsList>

        {[
          { value: "watched", items: watched },
          { value: "watching", items: watching },
          { value: "watchlist", items: watchlist },
        ].map(({ value, items }) => (
          <TabsContent key={value} value={value} className="mt-4">
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nothing here yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {items.map((s) => (
                  <MediaCard
                    key={s.id}
                    tmdbId={s.mediaItem.tmdbId}
                    type={s.mediaItem.type === MediaType.MOVIE ? "movie" : "tv"}
                    title={s.mediaItem.title}
                    poster={s.mediaItem.poster}
                    year={s.mediaItem.year}
                    rating={s.rating}
                    status={s.status}
                    compact
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
