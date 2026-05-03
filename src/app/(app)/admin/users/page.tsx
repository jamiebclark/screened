import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AdminDeleteUserButton } from "@/components/admin-delete-user-button";

export const metadata = { title: "Users | Admin | Screened" };

const INTEGRATION_LABELS = [
  { key: "plexConnection", label: "Plex" },
  { key: "letterboxdConnection", label: "Letterboxd" },
  { key: "jellyfinConnection", label: "Jellyfin" },
  { key: "tautulliConnection", label: "Tautulli" },
  { key: "traktConnection", label: "Trakt" },
] as const;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminUsersPage() {
  const session = await auth();
  if (!isSiteAdminEmail(session?.user?.email)) redirect("/");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      plexConnection: { select: { lastSyncedAt: true } },
      letterboxdConnection: { select: { lastSyncedAt: true } },
      jellyfinConnection: { select: { lastSyncedAt: true } },
      tautulliConnection: { select: { lastSyncedAt: true } },
      traktConnection: { select: { lastSyncedAt: true } },
      _count: { select: { watchEntries: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-baseline gap-3 mb-2">
        <h1 className="text-2xl font-bold">Users</h1>
        <span className="text-sm text-muted-foreground">{users.length}</span>
      </div>
      <p className="text-muted-foreground mb-8">All registered accounts.</p>

      <div className="rounded-lg border divide-y">
        {users.map((user) => {
          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          const connectedIntegrations = INTEGRATION_LABELS.filter(
            ({ key }) => user[key] !== null,
          );

          const isSelf = user.id === session!.user!.id;

          return (
            <div key={user.id} className="flex items-center gap-4 px-4 py-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage
                  src={user.avatarUrl ?? undefined}
                  alt={user.name}
                />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {user.name}
                  </span>
                  {isSelf && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      you
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-1 shrink-0">
                {connectedIntegrations.map(({ label }) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>

              <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground shrink-0 w-28">
                <span>{user._count.watchEntries} entries</span>
                <span>joined {formatDate(user.createdAt)}</span>
              </div>

              <div className="shrink-0">
                {isSelf ? (
                  <div className="h-8 w-8" />
                ) : (
                  <AdminDeleteUserButton
                    userId={user.id}
                    userName={user.name}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
