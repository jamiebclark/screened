import Link from "next/link";
import { ArrowRight, Sparkles, User } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings | Screened" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account preferences and connected services.
      </p>

      <div className="space-y-8">
        <section aria-labelledby="integrations-heading">
          <h2 id="integrations-heading" className="text-lg font-semibold mb-4">
            Integrations
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect external services to sync watch history and keep Screened up to date.
          </p>
          <ul className="flex flex-col gap-3">
            <li>
              <Link href="/settings/plex" className="block group">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base">Plex</CardTitle>
                      <CardDescription>
                        Sync watch history from your Plex server.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link href="/settings/letterboxd" className="block group">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base">Letterboxd</CardTitle>
                      <CardDescription>
                        Import your public diary and ratings from Letterboxd.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="general-heading">
          <h2 id="general-heading" className="text-lg font-semibold mb-4">
            General
          </h2>
          <ul className="flex flex-col gap-3">
            <li>
              <Link href="/settings/account" className="block group">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Account
                      </CardTitle>
                      <CardDescription>
                        Display name, email, and password.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link href="/settings/preferences" className="block group">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Saved preferences
                      </CardTitle>
                      <CardDescription>
                        Titles pre-loaded into the Movie Night Picker.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link href="/settings/watch-history" className="block group">
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base">Watch history & imports</CardTitle>
                      <CardDescription>
                        Review counts by Plex, Letterboxd, and manual entries — clear specific groups.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
