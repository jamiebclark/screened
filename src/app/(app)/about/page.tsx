import { ExternalLink } from "lucide-react";
import { getRepoDocumentationLinks } from "@/lib/app-release";

export const metadata = { title: "About | Screened" };

export default async function AboutPage() {
  const { readmeUrl, uiUxUrl } = await getRepoDocumentationLinks();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">About Screened</h1>
      <p className="mb-6 text-muted-foreground">
        Screened is a self-hosted app for tracking movies and TV with friends:
        shared lists, Plex and Letterboxd sync, a collaborative movie-night
        picker, and optional discovery features. Your data stays on this server.
      </p>

      <section aria-labelledby="docs-heading" className="mb-8">
        <h2 id="docs-heading" className="mb-3 text-lg font-semibold">
          Documentation
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Setup, environment variables, and feature details live in the
          repository. Links open the files on GitHub in a new tab when we can
          detect the repo URL from this deployment&apos;s changelog.
        </p>
        <ul className="flex flex-col gap-3 text-sm">
          {readmeUrl ? (
            <li>
              <a
                href={readmeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2"
              >
                README — quick start and features
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            </li>
          ) : (
            <li className="text-muted-foreground">
              README link unavailable (no GitHub URL found in{" "}
              <code className="text-xs">CHANGELOG.md</code>).
            </li>
          )}
          {uiUxUrl ? (
            <li>
              <a
                href={uiUxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2"
              >
                UI &amp; UX standards (contributor reference)
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
