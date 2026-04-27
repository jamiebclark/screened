import { readFile } from "node:fs/promises";
import { join } from "node:path";
import packageJson from "../../package.json";

/** Semver from package.json (updated by semantic-release on each release). */
export const APP_VERSION: string = packageJson.version;

/**
 * The first `## ...` block in root CHANGELOG.md (semantic-release format):
 * from the first release heading through the line before the next `##` heading.
 */
export function parseFirstChangelogReleaseSection(
  changelog: string,
): string | null {
  const t = changelog.trimStart();
  if (!t.startsWith("## ")) {
    return null;
  }
  const next = t.indexOf("\n## ");
  if (next === -1) {
    return t.trim();
  }
  return t.slice(0, next).trim();
}

/** First `https://github.com/owner/repo` in the changelog (used for a “full changelog” link). */
export function parseGithubRepoBaseFromChangelog(
  changelog: string,
): string | null {
  const m = changelog.match(/https:\/\/github\.com\/[^/]+\/[^/]+/);
  return m ? m[0] : null;
}

async function readRootChangelog(): Promise<string | null> {
  try {
    const path = join(process.cwd(), "CHANGELOG.md");
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export async function getLatestChangelogSection(): Promise<string | null> {
  const text = await readRootChangelog();
  return text ? parseFirstChangelogReleaseSection(text) : null;
}

export async function getChangelogFileUrlFromRepo(): Promise<string | null> {
  const text = await readRootChangelog();
  if (!text) return null;
  const base = parseGithubRepoBaseFromChangelog(text);
  return base ? `${base}/blob/main/CHANGELOG.md` : null;
}

/** Latest release markdown + changelog file URL in one disk read. */
export async function getLatestReleaseAndChangelogUrl(): Promise<{
  latestSection: string | null;
  changelogUrl: string | null;
}> {
  const text = await readRootChangelog();
  if (!text) return { latestSection: null, changelogUrl: null };
  const base = parseGithubRepoBaseFromChangelog(text);
  return {
    latestSection: parseFirstChangelogReleaseSection(text),
    changelogUrl: base ? `${base}/blob/main/CHANGELOG.md` : null,
  };
}

/** README and UI standards doc on GitHub when the repo URL appears in CHANGELOG.md. */
export async function getRepoDocumentationLinks(): Promise<{
  readmeUrl: string | null;
  uiUxUrl: string | null;
}> {
  const text = await readRootChangelog();
  if (!text) return { readmeUrl: null, uiUxUrl: null };
  const base = parseGithubRepoBaseFromChangelog(text);
  if (!base) return { readmeUrl: null, uiUxUrl: null };
  return {
    readmeUrl: `${base}/blob/main/README.md`,
    uiUxUrl: `${base}/blob/main/docs/ui-ux-standards.md`,
  };
}
