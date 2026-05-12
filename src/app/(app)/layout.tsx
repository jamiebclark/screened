import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/toaster";
import { prisma } from "@/lib/prisma";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { safeCallbackPath } from "@/lib/safe-callback-path";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const headersList = await headers();
  const currentPath = safeCallbackPath(headersList.get("x-pathname"));
  const callbackParam = `?callbackUrl=${encodeURIComponent(currentPath)}`;

  if (!session?.user) {
    redirect(`/login${callbackParam}`);
  }

  const [user, unreadNotifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompletedAt: true },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  if (!user) {
    redirect(`/login${callbackParam}`);
  }

  if (!user.onboardingCompletedAt) {
    redirect(`/onboarding${callbackParam}`);
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
      <Nav
        user={session.user}
        initialUnreadNotifications={unreadNotifications}
        isAdmin={isSiteAdminEmail(session.user.email)}
      />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="w-full flex-1">{children}</div>
        <SiteFooter />
      </main>
      <Toaster />
    </div>
  );
}
