import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReleasesFromDate } from "@/lib/releases-queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const fromDate = searchParams.get("fromDate");
  const rawPage = searchParams.get("page");
  const toDate = searchParams.get("toDate") ?? undefined;

  if (!fromDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    return NextResponse.json({ error: "Invalid fromDate" }, { status: 400 });
  }

  const page = rawPage ? parseInt(rawPage, 10) : 1;
  if (isNaN(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  const session = await auth();
  const { items, hasMore } = await getReleasesFromDate(
    fromDate,
    page,
    session?.user?.id,
    toDate,
  );

  return NextResponse.json({ items, hasMore });
}
