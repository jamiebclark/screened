import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/toaster";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
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
    redirect("/login");
  }

  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isOnboarding =
    pathname === "/onboarding" ||
    (pathname.length > 0 && pathname.startsWith("/onboarding/"));

  if (!user.onboardingCompletedAt && !isOnboarding) {
    redirect("/onboarding");
  }
  if (user.onboardingCompletedAt && isOnboarding) {
    redirect("/");
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
      <Nav
        user={session.user}
        initialUnreadNotifications={unreadNotifications}
      />
      <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div className="w-full flex-1">{children}</div>
        <SiteFooter />
      </main>
      <Toaster />
    </div>
  );
}
