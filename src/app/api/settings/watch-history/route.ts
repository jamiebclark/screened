import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isWatchHistoryResetScope } from "@/lib/watch-history-scopes";
import { getWatchImportCounts, resetWatchHistoryScope } from "@/lib/watch-import-stats";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const counts = await getWatchImportCounts(session.user.id);
  return NextResponse.json(counts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as { scope?: string } | null;
  const scope = body?.scope;

  if (!scope || !isWatchHistoryResetScope(scope)) {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  const result = await resetWatchHistoryScope(session.user.id, scope);
  return NextResponse.json({ deleted: result.count });
}
