import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchPerson, tmdbImage } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const { results } = await searchPerson(q, 1);
    const out = results.slice(0, 8).map((p) => ({
      id: p.id,
      name: p.name,
      role: p.known_for_department ?? null,
      profile: tmdbImage(p.profile_path, "w45"),
    }));
    return NextResponse.json({ results: out });
  } catch (err) {
    console.error("[search/person] error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
