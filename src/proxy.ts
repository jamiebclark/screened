import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function nextWithPathname(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-pathname",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// Exact list page (not /lists or /lists/new) and its timeline sub-page. Each
// page decides per visibility tier whether an anonymous visitor may see it.
// /lists/<slug>/history stays members-only and is not listed here.
const PUBLIC_LIST_PAGE = /^\/lists\/(?!new$)[^/]+$/;
const PUBLIC_LIST_TIMELINE_PAGE = /^\/lists\/(?!new$)[^/]+\/timeline$/;
// Anonymous reads of a single list; the handler enforces the tier.
const PUBLIC_LIST_API = /^\/api\/lists\/[^/]+$/;

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isApiAuth = pathname.startsWith("/api/auth");
  const isPlexAuthEndpoint = pathname === "/api/plex/auth";
  const isDiscordInteractionsEndpoint =
    pathname === "/api/discord/interactions";
  const isRadarrEndpoint = pathname.includes("/radarr");
  const isPublicRoute =
    pathname.startsWith("/releases") ||
    PUBLIC_LIST_PAGE.test(pathname) ||
    PUBLIC_LIST_TIMELINE_PAGE.test(pathname) ||
    (req.method === "GET" && PUBLIC_LIST_API.test(pathname));

  if (
    isApiAuth ||
    isPlexAuthEndpoint ||
    isDiscordInteractionsEndpoint ||
    isRadarrEndpoint ||
    isPublicRoute
  ) {
    return nextWithPathname(req);
  }

  if (!isLoggedIn && !isAuthPage) {
    const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.url),
    );
  }

  if (isLoggedIn && isAuthPage) {
    const raw = req.nextUrl.searchParams.get("callbackUrl") ?? "";
    const dest = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return nextWithPathname(req);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.png$).*)"],
};
