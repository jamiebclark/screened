import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import {
  APP_VERSION,
  getChangelogFileUrlFromRepo,
  getLatestChangelogSection,
} from "@/lib/app-release";

export const metadata = { title: "About | Screened" };

export default async function AboutSettingsPage() {
  const [latestSection, changelogUrl] = await Promise.all([
    getLatestChangelogSection(),
    getChangelogFileUrlFromRepo(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">About</h1>
      <p className="text-muted-foreground mb-6">
        Version and release notes come from{" "}
        <code className="text-xs">package.json</code> and{" "}
        <code className="text-xs">CHANGELOG.md</code> in the repository (updated
        automatically when a release runs on the default branch).
      </p>

      <section className="mb-8 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Current version
        </h2>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          v{APP_VERSION}
        </p>
      </section>

      {latestSection ? (
        <section aria-labelledby="whats-new-heading" className="mb-8">
          <h2 id="whats-new-heading" className="text-lg font-semibold mb-3">
            Latest release
          </h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <MarkdownContent
              content={latestSection}
              className="text-foreground"
            />
          </div>
        </section>
      ) : null}

      <p className="text-sm text-muted-foreground">
        <Link
          prefetch={false}
          href="/settings"
          className="text-primary underline underline-offset-2"
        >
          Back to settings
        </Link>
        {changelogUrl ? (
          <>
            {" · "}
            <a
              href={changelogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
            >
              Full changelog on GitHub
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
