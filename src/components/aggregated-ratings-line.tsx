import type { OmdbRatingEntry } from "@/lib/omdb";
import type { SimpleIcon } from "simple-icons";
import { siImdb, siMetacritic, siRottentomatoes } from "simple-icons";
import { SimpleBrandIcon } from "@/components/simple-brand-icon";

type Props = {
  ratings: OmdbRatingEntry[] | null;
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

/**
 * OMDb-sourced scores (RT, Metacritic, IMDb) as flex siblings — use inside the same row as year / TMDB.
 * Renders nothing when empty. Wrapper uses `display: contents` so items align with the parent flex.
 */
export function AggregatedRatingsLine({ ratings }: Props) {
  if (!ratings?.length) return null;

  return (
    <span
      className="contents"
      data-testid="omdb-aggregated-ratings"
      role="presentation"
    >
      {ratings.map((r, i) => {
        const display = formatOmdbValue(r.source, r.value);
        const icon = omdbSourceIcon(r.source);
        const aria = `${r.source} ${display}`;

        if (icon) {
          return (
            <span
              key={`${r.source}-${i}`}
              className="flex items-center gap-1"
              aria-label={aria}
            >
              <SimpleBrandIcon icon={icon} className="text-muted-foreground" />
              <span aria-hidden className="tabular-nums">
                {display}
              </span>
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
