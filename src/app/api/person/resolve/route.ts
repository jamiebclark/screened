import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchPersonByName } from "@/lib/tmdb";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { error: "Name parameter required" },
      { status: 400 },
    );
  }

  try {
    const result = await searchPersonByName(name);

    if (!result) {
      return NextResponse.json({ tmdbId: null, profilePath: null });
    }

    return NextResponse.json({
      tmdbId: result.tmdbId,
      profilePath: result.profilePath,
    });
  } catch (error) {
    console.error("Error resolving person:", error);
    return NextResponse.json(
      { error: "Failed to resolve person" },
      { status: 500 },
    );
  }
}
