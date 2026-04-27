import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchMulti, searchMovie, tmdbImage } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const type = req.nextUrl.searchParams.get("type") ?? "movie";
  const movieOnly = type === "movie";

  if (!q) return NextResponse.json({ results: [] });

  try {
    const response = movieOnly ? await searchMovie(q) : await searchMulti(q);

    const results = response.results
      .filter((r) =>
        movieOnly
          ? r.media_type === "movie"
          : r.media_type === "movie" || r.media_type === "tv",
      )
      .slice(0, 8)
      .map((r) => ({
        tmdbId: r.id,
        title: r.title ?? r.name ?? "Unknown",
        poster: tmdbImage(r.poster_path, "w185"),
        year:
          (r.release_date ?? r.first_air_date)
            ? new Date((r.release_date ?? r.first_air_date)!).getFullYear()
            : null,
        type: r.media_type ?? "movie",
      }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[search] error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
