import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Download,
  Lock,
  RefreshCw,
  Sparkles,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import {
  siDiscord,
  siJellyfin,
  siLetterboxd,
  siPlex,
  siTrakt,
} from "simple-icons";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SimpleBrandIcon } from "@/components/simple-brand-icon";
import { auth } from "@/lib/auth";
import { isTraktConfigured } from "@/lib/trakt";
import { isSiteAdminEmail } from "@/lib/signup-invites";

export const metadata = { title: "Settings | Screened" };

export default async function SettingsPage() {
  const session = await auth();
  const isSiteAdmin = isSiteAdminEmail(session?.user?.email);
  const traktConfigured = isTraktConfigured();
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
            Connect external services to sync watch history and keep Screened up
            to date.
          </p>
          <ul className="flex flex-col gap-3">
            <li>
              <Link
                prefetch={false}
                href="/settings/plex"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <SimpleBrandIcon icon={siPlex} />
                        Plex
                      </CardTitle>
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
              <Link
                prefetch={false}
                href="/settings/letterboxd"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <SimpleBrandIcon icon={siLetterboxd} />
                        Letterboxd
                      </CardTitle>
                      <CardDescription>
                        Import your public diary and ratings from Letterboxd.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link
                prefetch={false}
                href="/settings/tautulli"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4 shrink-0" />
                        Tautulli
                      </CardTitle>
                      <CardDescription>
                        Richer Plex session history with precise timestamps.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link
                prefetch={false}
                href="/settings/jellyfin"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <SimpleBrandIcon
                          icon={siJellyfin}
                          className="h-4 w-4 shrink-0 text-[#00A4DC]"
                        />
                        Jellyfin
                      </CardTitle>
                      <CardDescription>
                        Sync watch history from your Jellyfin server.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            {traktConfigured && (
              <li>
                <Link
                  prefetch={false}
                  href="/settings/trakt"
                  className="block group"
                >
                  <Card className="transition-colors hover:bg-accent/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <SimpleBrandIcon
                            icon={siTrakt}
                            className="h-4 w-4 shrink-0 text-[#ED1C24]"
                          />
                          Trakt
                        </CardTitle>
                        <CardDescription>
                          Import your full watch history from Trakt.
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            )}
            <li>
              <Link
                prefetch={false}
                href="/settings/overseerr"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Download className="h-4 w-4 shrink-0 text-[#F97316]" />
                        Overseerr
                      </CardTitle>
                      <CardDescription>
                        Auto-request downloads when you add to your watchlist.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link
                prefetch={false}
                href="/settings/discord"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <SimpleBrandIcon icon={siDiscord} />
                        Discord
                      </CardTitle>
                      <CardDescription>
                        Channel notifications and slash commands.
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
            {isSiteAdmin && (
              <>
                <li>
                  <Link
                    prefetch={false}
                    href="/settings/invites"
                    className="block group"
                  >
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-primary" />
                            Signup invites
                          </CardTitle>
                          <CardDescription>
                            Create links for new members when this server is
                            invite-only.
                          </CardDescription>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
                <li>
                  <Link
                    prefetch={false}
                    href="/admin/cron"
                    className="block group"
                  >
                    <Card className="transition-colors hover:bg-accent/50">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-primary" />
                            Cron status
                          </CardTitle>
                          <CardDescription>
                            Sync job history and last-run status for all
                            integrations.
                          </CardDescription>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardHeader>
                    </Card>
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link
                prefetch={false}
                href="/settings/account"
                className="block group"
              >
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
              <Link
                prefetch={false}
                href="/settings/privacy"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        Privacy
                      </CardTitle>
                      <CardDescription>
                        Who can see your watchlist and watch activity on your
                        profile.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link
                prefetch={false}
                href="/settings/friends"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Friends
                      </CardTitle>
                      <CardDescription>
                        Send and manage friend requests.
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </CardHeader>
                </Card>
              </Link>
            </li>
            <li>
              <Link
                prefetch={false}
                href="/settings/preferences"
                className="block group"
              >
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
              <Link
                prefetch={false}
                href="/settings/watch-history"
                className="block group"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base">
                        Watch history & imports
                      </CardTitle>
                      <CardDescription>
                        Review counts by Plex, Letterboxd, and manual entries —
                        clear specific groups.
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
