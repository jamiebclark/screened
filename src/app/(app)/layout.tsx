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
    <div className="min-h-screen flex flex-col">
      <Nav user={session.user} initialUnreadNotifications={unreadNotifications} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
