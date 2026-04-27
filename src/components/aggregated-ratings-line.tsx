import type { OmdbRatingsBlock } from "@/lib/omdb";
import { buildOmdbSourceHref } from "@/lib/omdb";
import type { SimpleIcon } from "simple-icons";
import { siImdb, siMetacritic, siRottentomatoes } from "simple-icons";
import { SimpleBrandIcon } from "@/components/simple-brand-icon";

type Props = {
  omdb: OmdbRatingsBlock | null;
  imdbId: string | null;
  linkTitle: string;
  mediaType: "movie" | "tv";
};

function omdbSourceIcon(source: string): SimpleIcon | null {
  if (source === "Rotten Tomatoes") return siRottentomatoes;
  if (source === "Metacritic") return siMetacritic;
  if (source === "Internet Movie Database") return siImdb;
  return null;
}

function shortSourceLabel(source: string): string {
  if (source === "Rotten Tomatoes") return "RT";
  if (source === "Metacritic") return "Metacritic";
  if (source === "Internet Movie Database") return "IMDb";
  return source;
}

function formatOmdbValue(source: string, value: string): string {
  const v = value.trim();
  if (source === "Internet Movie Database") {
    return v.replace(/\/\s*10$/i, "").trim();
  }
  if (source === "Metacritic") {
    return v.replace(/\/\s*100$/i, "").trim();
  }
  return v;
}

const externalLinkClass =
  "inline-flex items-center gap-1 rounded-sm text-muted-foreground transition-colors hover:text-foreground hover:underline underline-offset-2";

/**
 * OMDb-sourced scores as flex siblings — use inside the same row as year / TMDB.
 * Renders nothing when empty. Wrapper uses `display: contents` so items align with the parent flex.
 */
export function AggregatedRatingsLine({
  omdb,
  imdbId,
  linkTitle,
  mediaType,
}: Props) {
  if (!omdb?.ratings?.length) return null;

  const hrefCtx = {
    imdbId,
    linkTitle,
    mediaType,
    rottenTomatoesUrl: omdb.rottenTomatoesUrl,
  };

  return (
    <span
      className="contents"
      data-testid="omdb-aggregated-ratings"
      role="presentation"
    >
      {omdb.ratings.map((r, i) => {
        const display = formatOmdbValue(r.source, r.value);
        const icon = omdbSourceIcon(r.source);
        const aria = `${r.source} ${display}`;
        const href = buildOmdbSourceHref(r.source, hrefCtx);

        if (icon) {
          const inner = (
            <>
              <SimpleBrandIcon icon={icon} className="text-muted-foreground" />
              <span aria-hidden className="tabular-nums">
                {display}
              </span>
            </>
          );

          if (href) {
            return (
              <a
                key={`${r.source}-${i}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={externalLinkClass}
                aria-label={`${aria} (opens in new tab)`}
              >
                {inner}
              </a>
            );
          }

          return (
            <span
              key={`${r.source}-${i}`}
              className="flex items-center gap-1"
              aria-label={aria}
            >
              {inner}
            </span>
          );
        }

        return (
          <span key={`${r.source}-${i}`} className="flex items-center gap-1">
            {shortSourceLabel(r.source)} {display}
          </span>
        );
      })}
    </span>
  );
}
