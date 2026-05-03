import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isSiteAdminEmail } from "@/lib/signup-invites";
import Link from "next/link";
import { ArrowRight, RefreshCw, ScrollText, Users } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Admin" };

const adminSections = [
  {
    href: "/admin/users",
    icon: Users,
    title: "Users",
    description: "All registered accounts with integrations and watch counts.",
  },
  {
    href: "/admin/cron",
    icon: RefreshCw,
    title: "Cron status",
    description: "Sync job history and last-run status for all integrations.",
  },
  {
    href: "/admin/logs",
    icon: ScrollText,
    title: "Error logs",
    description: "In-memory ring buffer of server errors and warnings.",
  },
];

export default async function AdminPage() {
  const session = await auth();
  if (!isSiteAdminEmail(session?.user?.email)) redirect("/");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Admin</h1>
      <p className="text-muted-foreground mb-8">
        Site administration and system status.
      </p>

      <ul className="flex flex-col gap-3">
        {adminSections.map(({ href, icon: Icon, title, description }) => (
          <li key={href}>
            <Link prefetch={false} href={href} className="block group">
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      {title}
                    </CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
