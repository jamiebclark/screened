import { FriendsSettings } from "./friends-settings";

export const metadata = { title: "Friends | Settings | Screened" };

export default function FriendsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Friends</h1>
      <p className="text-muted-foreground mb-8">
        Send requests, accept or decline, and see who you are connected to. “Friends” can see
        profile sections you set to &quot;Friends only&quot; in Privacy.
      </p>
      <FriendsSettings />
    </div>
  );
}
