import { auth } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/toaster";
import { isSiteAdminEmail } from "@/lib/signup-invites";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
      <Nav
        user={session?.user ?? null}
        initialUnreadNotifications={0}
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
