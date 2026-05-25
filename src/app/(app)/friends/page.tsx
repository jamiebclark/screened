import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getFriendsData,
  getRecentActivityPerFriend,
} from "@/lib/friends-queries";
import { FriendRequestsPanel } from "@/components/friend-requests-panel";
import { FindFriendsPanel } from "@/components/find-friends-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

export const metadata: Metadata = { title: "Friends" };

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatWatchedAt(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const data = await getFriendsData(userId);
  const friendIds = data.friends.map((f) => f.id);
  const activityMap = await getRecentActivityPerFriend(friendIds);

  const outgoingIds = data.outgoing.map((o) => o.toUser.id);

  const isEmpty =
    data.friends.length === 0 &&
    data.incoming.length === 0 &&
    data.outgoing.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold">Friends</h1>

      <FindFriendsPanel friendIds={friendIds} outgoingIds={outgoingIds} />

      <FriendRequestsPanel incoming={data.incoming} outgoing={data.outgoing} />

      <section aria-labelledby="friends-heading">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold" id="friends-heading">
            Your friends{" "}
            {data.friends.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {data.friends.length}
              </span>
            )}
          </h3>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/activity"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Activity className="h-4 w-4" />
              Activity feed
            </Link>
          </Button>
        </div>

        {data.friends.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.friends.map((friend) => {
              const activity = activityMap.get(friend.id);
              return (
                <li key={friend.id}>
                  <Link
                    href={`/profile/${friend.id}`}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent/30"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 shrink-0">
                        <AvatarImage src={friend.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-lg">
                          {initials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-base font-semibold leading-tight">
                        {friend.name}
                      </p>
                    </div>
                    {activity ? (
                      <p className="text-sm text-muted-foreground">
                        Watched{" "}
                        <span className="font-medium text-foreground/80">
                          {activity.title}
                        </span>{" "}
                        {formatWatchedAt(activity.watchedAt)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No recent activity
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : isEmpty ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t added any friends yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the search above to find people you know.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No friends yet.</p>
        )}
      </section>
    </div>
  );
}
