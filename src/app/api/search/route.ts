import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  searchMulti,
  searchMovie,
  searchTv,
  tmdbImage,
  TmdbSearchResult,
} from "@/lib/tmdb";
import { parseTitleSearchParams } from "@/lib/title-search-params";

type MappedResult = {
  tmdbId: number;
  title: string;
  poster: string | null;
  year: number | null;
  type: "movie" | "tv";
};

function mapResult(r: TmdbSearchResult): MappedResult {
  return {
    tmdbId: r.id,
    title: r.title ?? r.name ?? "Unknown",
    poster: tmdbImage(r.poster_path, "w185"),
    year:
      (r.release_date ?? r.first_air_date)
        ? new Date((r.release_date ?? r.first_air_date)!).getFullYear()
        : null,
    type: r.media_type,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = parseTitleSearchParams(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { q, mediaType, year, page, limit } = parsed.value;

  if (!q) {
    return NextResponse.json({
      results: [],
      page: 1,
      totalPages: 0,
      totalResults: 0,
    });
  }

  try {
    let results: TmdbSearchResult[];
    let totalPages: number;
    let totalResults: number;

    if (mediaType === "movie") {
      const res = await searchMovie(q, year ?? undefined, page);
      results = res.results;
      totalPages = res.total_pages;
      totalResults = res.total_results;
    } else if (mediaType === "tv") {
      const res = await searchTv(q, year ?? undefined, page);
      results = res.results;
      totalPages = res.total_pages;
      totalResults = res.total_results;
    } else if (year !== null) {
      const [movieRes, tvRes] = await Promise.all([
        searchMovie(q, year, page),
        searchTv(q, year, page),
      ]);
      results = [...movieRes.results, ...tvRes.results].sort((a, b) => {
        const pa = a.popularity ?? 0;
        const pb = b.popularity ?? 0;
        if (pb !== pa) return pb - pa;
        const ta = a.title ?? a.name ?? "";
        const tb = b.title ?? b.name ?? "";
        if (ta !== tb) return ta.localeCompare(tb);
        return a.id - b.id;
      });
      totalPages = Math.max(movieRes.total_pages, tvRes.total_pages);
      totalResults = movieRes.total_results + tvRes.total_results;
    } else {
      const res = await searchMulti(q, page);
      results = res.results.filter(
        (r) => r.media_type === "movie" || r.media_type === "tv",
      );
      totalPages = res.total_pages;
      totalResults = res.total_results;
    }

    const mapped = results.slice(0, limit).map(mapResult);

    return NextResponse.json({
      results: mapped,
      page,
      totalPages,
      totalResults,
    });
  } catch (err) {
    console.error("[search] error:", err);
    return NextResponse.json(
      { error: "Title search is temporarily unavailable" },
      { status: 502 },
    );
  }
}
