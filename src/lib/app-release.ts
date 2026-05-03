import { readFile } from "node:fs/promises";
import { join } from "node:path";
import packageJson from "../../package.json";

/** Semver from package.json (updated by semantic-release on each release). */
export const APP_VERSION: string = packageJson.version;

/** Base GitHub repo URL from package.json `repository.url`, or null if absent. */
function getRepoBaseUrl(): string | null {
  const url =
    typeof packageJson.repository === "object"
      ? packageJson.repository.url
      : typeof packageJson.repository === "string"
        ? packageJson.repository
        : null;
  if (!url) return null;
  const m = url.match(/https:\/\/github\.com\/[^/]+\/[^/.]+/);
  return m ? m[0] : null;
}

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

/**
 * First `https://github.com/owner/repo` in the changelog text.
 * Still used by tests and changelog-section parsing; repo links now come from package.json.
 */
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
  const base = getRepoBaseUrl();
  return base ? `${base}/blob/main/CHANGELOG.md` : null;
}

/** Latest release markdown + changelog file URL in one disk read. */
export async function getLatestReleaseAndChangelogUrl(): Promise<{
  latestSection: string | null;
  changelogUrl: string | null;
}> {
  const text = await readRootChangelog();
  const base = getRepoBaseUrl();
  return {
    latestSection: text ? parseFirstChangelogReleaseSection(text) : null,
    changelogUrl: base ? `${base}/blob/main/CHANGELOG.md` : null,
  };
}

/** README and UI standards doc on GitHub, sourced from package.json `repository`. */
export async function getRepoDocumentationLinks(): Promise<{
  readmeUrl: string | null;
  uiUxUrl: string | null;
  listsUrl: string | null;
  pickerUrl: string | null;
  watchPartiesUrl: string | null;
}> {
  const base = getRepoBaseUrl();
  if (!base)
    return {
      readmeUrl: null,
      uiUxUrl: null,
      listsUrl: null,
      pickerUrl: null,
      watchPartiesUrl: null,
    };
  return {
    readmeUrl: `${base}/blob/main/README.md`,
    uiUxUrl: `${base}/blob/main/docs/ui-ux-standards.md`,
    listsUrl: `${base}/blob/main/docs/lists.md`,
    pickerUrl: `${base}/blob/main/docs/picker.md`,
    watchPartiesUrl: `${base}/blob/main/docs/watch-parties.md`,
  };
}
