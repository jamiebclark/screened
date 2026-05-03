import { NextRequest, NextResponse } from "next/server";
import { searchPersonByName, tmdbImage } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Name parameter required" },
      { status: 400 },
    );
  }

  try {
    const tmdbId = await searchPersonByName(name);

    if (!tmdbId) {
      return NextResponse.json({ tmdbId: null, profilePath: null });
    }

    return NextResponse.json({ tmdbId, profilePath: null });
  } catch (error) {
    console.error("Error resolving person:", error);
    return NextResponse.json(
      { error: "Failed to resolve person" },
      { status: 500 },
    );
  }
}
