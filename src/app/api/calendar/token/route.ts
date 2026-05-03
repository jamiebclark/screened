import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCalendarToken } from "@/lib/ensure-calendar-token";
import { generateToken } from "@/lib/utils";

function feedUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/calendar/feed?token=${token}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await ensureCalendarToken(session.user.id);
  return NextResponse.json({ url: feedUrl(token) });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = generateToken(24);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarToken: token },
  });
  return NextResponse.json({ url: feedUrl(token) });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarToken: null },
  });
  return NextResponse.json({ ok: true });
}
