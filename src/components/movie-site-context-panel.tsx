import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { titlePageSectionStack } from "@/lib/title-page-layout";
import type { MovieSiteContext, TitleCatalogLinks } from "@/lib/movie-site-context";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const PLEX_CARD =
  "relative flex w-44 flex-shrink-0 flex-col gap-2.5 rounded-lg border border-border bg-card/30 p-3 pt-3.5";

const PLEX_CARD_INTERACTIVE = cn(
  PLEX_CARD,
  "transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

/** TMDB, Letterboxd, and IMDb for a title — used beside the poster (desktop) and in the main column (mobile). */
export function TitleCatalogLinks({ links }: { links: TitleCatalogLinks }) {
  const items: { href: string; label: string }[] = [
    { href: links.tmdbUrl, label: "TMDB" },
    ...(links.letterboxdFilmUrl ? [{ href: links.letterboxdFilmUrl, label: "Letterboxd" }] : []),
    ...(links.imdbUrl ? [{ href: links.imdbUrl, label: "IMDb" }] : []),
  ];

  return (
    <div className="min-w-0">
      <h3 className="text-base font-semibold mb-3">External links</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
          >
            {item.label}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function PlexLinkCard({
  openUrl,
  name,
  avatarUrl,
  primary,
  secondary,
  isViewer,
}: {
  openUrl: string;
  name: string;
  avatarUrl: string | null;
  primary: string;
  secondary: string;
  isViewer: boolean;
}) {
  return (
    <a
      href={openUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={PLEX_CARD_INTERACTIVE}
    >
      <span className="sr-only">
        {isViewer
          ? "Open your Plex in a new window"
          : `Open ${name}’s Plex in a new window`}
      </span>
      <ExternalLink
        className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground"
        aria-hidden
      />
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs">{initialsFromName(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{primary}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{secondary}</p>
      </div>
    </a>
  );
}

function PlexStaticCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(PLEX_CARD, "text-sm text-muted-foreground", className)}>{children}</div>;
}

function YourPlexBlock({ context }: { context: MovieSiteContext }) {
  const { myPlex, viewer } = context;
  const { name, avatarUrl } = viewer;

  if (myPlex.state === "not_linked") {
    return (
      <Link
        href="/settings/plex"
        className={cn(
          PLEX_CARD_INTERACTIVE,
          "text-foreground no-underline"
        )}
      >
        <span className="sr-only">Connect Plex in settings (same window)</span>
        <Settings2
          className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground"
          aria-hidden
        />
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="text-xs">{initialsFromName(name)}</AvatarFallback>
        </Avatar>
        <p className="text-sm font-semibold text-foreground leading-tight">Connect Plex</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Link your account to match this title in your library and open it from Screened.
        </p>
      </Link>
    );
  }

  if (myPlex.state === "not_in_library") {
    return (
      <PlexStaticCard>
        <div className="space-y-2.5 pr-4">
          <div className="flex gap-2.5">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl ?? undefined} alt="" />
              <AvatarFallback className="text-xs">{initialsFromName(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-2">{name}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">Your Plex library</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Not in your movies on Plex.</p>
        </div>
      </PlexStaticCard>
    );
  }

  return (
    <PlexLinkCard
      openUrl={myPlex.openUrl}
      name={name}
      avatarUrl={avatarUrl}
      primary={name}
      secondary="Your Plex library"
      isViewer
    />
  );
}

/**
 * In-app blocks for a movie (your lists, Plex). External links use {@link TitleCatalogLinks} beside the poster.
 * Same width/spacing as {@link titlePageSection} / Watch history — not a card wrapper.
 */
export function TitleSiteContext({ children }: { children: ReactNode }) {
  return <div className={titlePageSectionStack}>{children}</div>;
}

export function MovieScreenedContextSkeleton() {
  return (
    <>
      <Separator />
      <div className="h-5 w-32 rounded bg-muted animate-pulse" aria-hidden />
      <div className="h-5 w-20 rounded bg-muted animate-pulse" aria-hidden />
      <div
        className="h-[118px] w-44 flex-shrink-0 rounded-lg border border-border bg-muted/50 animate-pulse"
        aria-hidden
      />
      <p className="text-xs text-muted-foreground">Loading your lists and Plex…</p>
    </>
  );
}

export function MovieScreenedContextBody({ context }: { context: MovieSiteContext }) {
  const hasLists = context.lists.length > 0;
  return (
    <>
      <Separator />
      {hasLists && (
        <div>
          <h3 className="text-base font-semibold mb-3">Your lists</h3>
          <ul className="flex flex-wrap gap-2">
            {context.lists.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/lists/${l.slug}`}
                  className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                >
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={hasLists ? "mt-6" : ""}>
        <h3 className="text-base font-semibold mb-3">Plex</h3>
        <div className="flex flex-wrap gap-3" aria-label="Plex libraries for this title">
          <YourPlexBlock context={context} />
          {context.friendsInPlex.map((f) => (
            <PlexLinkCard
              key={f.userId}
              openUrl={f.openUrl}
              name={f.name}
              avatarUrl={f.avatarUrl}
              primary={f.name}
              secondary="Plex library"
              isViewer={false}
            />
          ))}
        </div>
      </div>
    </>
  );
}
