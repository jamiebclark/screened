import { NextRequest, NextResponse } from "next/server";
import { sendConfirmationPrompts } from "@/lib/watch-party";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const notified = await sendConfirmationPrompts();
    const durationMs = Date.now() - startedAt;

    console.log(
      `[cron/watch-party-confirm] ${new Date().toISOString()} Sent ${notified} confirmation prompts in ${durationMs}ms`,
    );

    return NextResponse.json({ notified, durationMs });
  } catch (err) {
    console.error("[cron/watch-party-confirm] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
