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

export async function getLatestChangelogSection(): Promise<string | null> {
  try {
    const path = join(process.cwd(), "CHANGELOG.md");
    const text = await readFile(path, "utf8");
    return parseFirstChangelogReleaseSection(text);
  } catch {
    return null;
  }
}

export async function getChangelogFileUrlFromRepo(): Promise<string | null> {
  try {
    const path = join(process.cwd(), "CHANGELOG.md");
    const text = await readFile(path, "utf8");
    const base = parseGithubRepoBaseFromChangelog(text);
    return base ? `${base}/blob/main/CHANGELOG.md` : null;
  } catch {
    return null;
  }
}
