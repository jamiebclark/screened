import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncLetterboxdUser } from "@/lib/letterboxd-sync";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncLetterboxdUser(session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("Letterboxd sync error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
