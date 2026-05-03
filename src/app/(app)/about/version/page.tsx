import { ExternalLink } from "lucide-react";
import { MarkdownContent } from "@/components/markdown-content";
import {
  APP_VERSION,
  getLatestReleaseAndChangelogUrl,
} from "@/lib/app-release";

export const metadata = { title: "Version" };

export default async function AboutVersionPage() {
  const { latestSection, changelogUrl } =
    await getLatestReleaseAndChangelogUrl();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Version</h1>
      <p className="mb-6 text-muted-foreground">
        The running semver comes from{" "}
        <code className="text-xs">package.json</code>. The latest release notes
        below are the first section of{" "}
        <code className="text-xs">CHANGELOG.md</code> (updated when a release
        runs on the default branch).
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

      {changelogUrl ? (
        <p className="text-sm text-muted-foreground">
          <a
            href={changelogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
          >
            Full changelog on GitHub
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </p>
      ) : null}
    </div>
  );
}
