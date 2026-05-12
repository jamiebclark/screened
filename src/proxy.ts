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

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register");
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const isPlexAuthEndpoint = req.nextUrl.pathname === "/api/plex/auth";
  const isDiscordInteractionsEndpoint =
    req.nextUrl.pathname === "/api/discord/interactions";
  const isRadarrEndpoint = req.nextUrl.pathname.includes("/radarr");

  if (
    isApiAuth ||
    isPlexAuthEndpoint ||
    isDiscordInteractionsEndpoint ||
    isRadarrEndpoint
  ) {
    return nextWithPathname(req);
  }

  if (!isLoggedIn && !isAuthPage) {
    const callbackUrl = encodeURIComponent(
      req.nextUrl.pathname + req.nextUrl.search,
    );
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
