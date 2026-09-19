import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Shared per-request checks for a signed-in user rendering the app shell
 * (nav + footer). Used by both the auth-guarded `(app)` layout and the
 * `(public)` layout when a session is present, so onboarding enforcement
 * and the notification badge behave the same on every page.
 *
 * Redirects (and never returns) when the account no longer exists or has
 * not finished onboarding.
 */
export async function loadSignedInShell(
  userId: string,
  currentPath: string,
): Promise<{ unreadNotifications: number }> {
  const callbackParam = `?callbackUrl=${encodeURIComponent(currentPath)}`;

  const [user, unreadNotifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  if (!user) {
    // JWT is valid but account no longer exists — sign out to clear the cookie
    // before redirecting, otherwise the middleware loops: login → app → login.
    redirect(`/api/auth/sign-out-redirect${callbackParam}`);
  }

  if (!user.onboardingCompletedAt) {
    redirect(`/onboarding${callbackParam}`);
  }

  return { unreadNotifications };
}
