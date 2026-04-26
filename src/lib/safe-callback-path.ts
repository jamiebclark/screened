/** Restrict redirects after login to same-origin paths (open-redirect safe). */
export function safeCallbackPath(raw: string | null): string {
  if (raw == null || typeof raw !== "string") return "/";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  if (t.includes("\n") || t.includes("\r")) return "/";
  return t;
}
