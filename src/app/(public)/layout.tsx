import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/toaster";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { safeCallbackPath } from "@/lib/safe-callback-path";
import { loadSignedInShell } from "@/lib/app-shell";

/**
 * Shell for routes that render without a session (release notes, public
 * lists). Signed-in visitors get the same checks and notification badge as
 * the `(app)` layout; anonymous visitors get the nav's sign-in affordances.
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  let unreadNotifications = 0;
  if (session?.user) {
    const headersList = await headers();
    const currentPath = safeCallbackPath(headersList.get("x-pathname"));
    ({ unreadNotifications } = await loadSignedInShell(
      session.user.id,
      currentPath,
    ));
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
      <Nav
        user={session?.user ?? null}
        initialUnreadNotifications={unreadNotifications}
        isAdmin={isSiteAdminEmail(session?.user?.email)}
      />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="w-full flex-1">{children}</div>
        <SiteFooter />
      </main>
      <Toaster />
    </div>
  );
}
