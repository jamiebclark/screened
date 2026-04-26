import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden">
      <Nav user={session.user} initialUnreadNotifications={unreadNotifications} />
      <main className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
    </div>
  );
}
