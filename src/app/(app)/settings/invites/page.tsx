import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import { SignupInvitesManager } from "./signup-invites-manager";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Signup invites | Screened" };

export default async function SignupInvitesSettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  if (!isSiteAdminEmail(session.user.email)) {
    redirect("/settings");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
      </p>
      <h1 className="text-2xl font-bold mb-2">Signup invites</h1>
      <p className="text-muted-foreground mb-8">
        Create links that allow new people to register when{" "}
        <code className="text-xs">ALLOW_PUBLIC_SIGNUP</code> is off. Your email
        is listed in <code className="text-xs">SITE_ADMIN_EMAILS</code> in the
        server environment.
      </p>
      <SignupInvitesManager />
    </div>
  );
}
